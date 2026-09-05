import httpStatus from "http-status";
import { ReqUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { prisma } from "../../lib/prisma";
import { isAfter, isBefore } from "date-fns";
import { getBkashIdToken } from "../../lib/bkash";
import { config } from "../../config";
import { isSubscriptionActive } from "../../utils/helper";

const createPayment = async (user: ReqUser, payload: any) => {
  const {planId} = payload
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
    include: {
      managerProfile: true,
    },
  });

  if (!existingUser) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "User not found",
    );
  }

  if (existingUser.role !== "MANAGER") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only manager can create a subscription",
    );
  }

  if (
    existingUser.isDeleted ||
    existingUser.status === "DELETED"
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account is deleted, please contact an admin",
    );
  }

  if (existingUser.status === "BLOCKED") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account is blocked, please contact an admin",
    );
  }

  if (!existingUser.managerProfile) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Manager profile not found",
    );
  }


  const manager = await prisma.manager.findUnique({
    where: {
      id: existingUser.managerProfile.id,
    },
  });

  if (!manager) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Manager not found",
    );
  }



  const plan = await prisma.plan.findUnique({
    where: {
      id: planId,
    },
  });

  if (!plan) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Subscription plan not found",
    );
  }

  if (plan.name === "FREE") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "FREE plan does not require payment",
    );
  }

  const currentSubscription =
    await prisma.subscription.findFirst({
      where: {
        managerId: manager.id,
        status: "ACTIVE",
        endDate: {
          gt: new Date(),
        },
      },
    });

  if (currentSubscription) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Your current subscription is still active",
    );
  }


  const merchantInvoiceNumber =
    `SUB-${Date.now()}-${crypto
      .randomUUID()
      .slice(0, 8)}`;


  const payment = await prisma.$transaction(
    async (tx) => {
      return tx.payment.create({
        data: {
          managerId: manager.id,

          amount: plan.price,
          currency: plan.currency,

          status: "PENDING",

          merchantInvoiceNumber,
          payerReference: existingUser.email,
        },
      });
    },
  );



  const bkashIdToken = await getBkashIdToken();

  if (!bkashIdToken) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: "FAILED",
        },
      });
    });

    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "No Bkash access token found",
    );
  }

  const bkashHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: bkashIdToken,
    "X-App-Key": config.bkash_app_key,
  };


  const bkashCreatePayment = await fetch(
    `${config.bkash_sandbox_base_url}/tokenized/checkout/create`,
    {
      method: "POST",

      headers: bkashHeaders,

      body: JSON.stringify({
        mode: "0011",

        payerReference: existingUser.email,

        callbackURL:
          `${config.bkash_callback_url}/subscription/payment/callback`,
        amount: plan.price.toString(),

        currency: plan.currency,

        intent: "sale",

        merchantInvoiceNumber:
          payment.merchantInvoiceNumber,
      }),
    },
  );

  const bkashResponse =
    await bkashCreatePayment.json();


  if (!bkashCreatePayment.ok) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: "FAILED",

          gatewayResponse: bkashResponse,
        },
      });
    });

    throw new AppError(
      httpStatus.BAD_GATEWAY,
      bkashResponse?.statusMessage ||
        "Failed to create Bkash payment",
    );
  }


  const updatedPayment = await prisma.$transaction(
    async (tx) => {
      return tx.payment.update({
        where: {
          id: payment.id,
        },

        data: {
          bkashPaymentId:
            bkashResponse?.paymentID,

          gatewayResponse:
            bkashResponse,
        },
      });
    },
  );

  return {
    paymentId: updatedPayment.id,

    merchantInvoiceNumber:
      updatedPayment.merchantInvoiceNumber,

    amount: updatedPayment.amount,

    currency: updatedPayment.currency,

    plan: {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
    },

    bkash: bkashResponse,
  };
};

export const paymentService = {
  createPayment,
};
