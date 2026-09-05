import httpStatus from "http-status";
import { ReqUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { prisma } from "../../lib/prisma";
import { addMonths, isAfter, isBefore } from "date-fns";
import { getBkashIdToken } from "../../lib/bkash";
import { config } from "../../config";

const createPayment = async (user: ReqUser, payload: any) => {
  const { planId } = payload;
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
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (existingUser.role !== "MANAGER") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only manager can create a subscription",
    );
  }

  if (existingUser.isDeleted || existingUser.status === "DELETED") {
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
    throw new AppError(httpStatus.NOT_FOUND, "Manager profile not found");
  }

  const manager = await prisma.manager.findUnique({
    where: {
      id: existingUser.managerProfile.id,
    },
  });

  if (!manager) {
    throw new AppError(httpStatus.NOT_FOUND, "Manager not found");
  }

  const plan = await prisma.plan.findUnique({
    where: {
      id: planId,
    },
  });

  if (!plan) {
    throw new AppError(httpStatus.NOT_FOUND, "Subscription plan not found");
  }

  if (plan.name === "FREE") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "FREE plan does not require payment",
    );
  }

  const currentSubscription = await prisma.subscription.findFirst({
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

  const merchantInvoiceNumber = `SUB-${Date.now()}-${crypto
    .randomUUID()
    .slice(0, 8)}`;

  const payment = await prisma.$transaction(async (tx) => {
    return tx.payment.create({
      data: {
        managerId: manager.id,
        planId: plan.id,

        amount: plan.price,
        currency: plan.currency,

        status: "PENDING",

        merchantInvoiceNumber,
        payerReference: existingUser.email,
      },
    });
  });

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

    throw new AppError(httpStatus.BAD_GATEWAY, "No Bkash access token found");
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

        callbackURL: `${config.bkash_callback_url}/subscription/payment/callback`,
        amount: plan.price.toString(),

        currency: plan.currency,

        intent: "sale",

        merchantInvoiceNumber: payment.merchantInvoiceNumber,
      }),
    },
  );

  const bkashResponse = await bkashCreatePayment.json();

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
      bkashResponse?.statusMessage || "Failed to create Bkash payment",
    );
  }

  await prisma.$transaction(async (tx) => {
    return tx.payment.update({
      where: {
        id: payment.id,
      },

      data: {
        bkashPaymentId: bkashResponse?.paymentID,

        gatewayResponse: bkashResponse,
      },
    });
  });

  return {
    // paymentId: updatedPayment.id,

    // merchantInvoiceNumber:
    //   updatedPayment.merchantInvoiceNumber,

    // amount: updatedPayment.amount,

    // currency: updatedPayment.currency,

    // plan: {
    //   id: plan.id,
    //   name: plan.name,
    //   price: plan.price,
    //   currency: plan.currency,
    // },

    bkash: bkashResponse.bkashURL,
  };
};
const createdPaymentCallBack = async (query: Record<string, any>) => {
  const paymentId = query.paymentID;
  if (!paymentId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Payment Id Missing");
  }
  const status = query.status as string;
  if (!status) {
    throw new AppError(httpStatus.BAD_REQUEST, "Payment Status Missing");
  }
  const bkashIdToken = await getBkashIdToken();

  if (!bkashIdToken) {
    throw new AppError(httpStatus.BAD_GATEWAY, "No Bkash access token found");
  }

  const getBkashHeaders = () => ({
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: bkashIdToken,
    "X-App-Key": config.bkash_app_key,
  });

  if (status === "cancel") {
    const existingPayment = await prisma.payment.findFirst({
      where: { bkashPaymentId: paymentId },
    });

    if (!existingPayment) {
      throw new AppError(httpStatus.NOT_FOUND, "Payment record not found");
    }

    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: { status: "CANCELLED" },
    });

    return {
      redirectUrl: `${config.frontend_url}/dashboard/my-payment?status=cancel`,
    };
  }
  if (status === "failure") {
    const existingPayment = await prisma.payment.findFirst({
      where: { bkashPaymentId: paymentId },
    });

    if (!existingPayment) {
      throw new AppError(httpStatus.NOT_FOUND, "Payment record not found");
    }

    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: { status: "FAILED" },
    });

    return {
      redirectUrl: `${config.frontend_url}/dashboard/my-payment?status=failure`,
    };
  }
  if (status !== "success") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Unknown payment status: ${status}`,
    );
  }

  const executeResponse = await fetch(
    `${config.bkash_sandbox_base_url}/tokenized/checkout/execute`,
    {
      method: "POST",
      headers: getBkashHeaders(),
      body: JSON.stringify({
        paymentID: paymentId,
      }),
    },
  );
  const executeResult = await executeResponse.json();
  if (!executeResponse.ok || executeResult.statusCode !== "0000") {
    // Mark the payment as failed if bkash execute itself fails
    const existingPayment = await prisma.payment.findFirst({
      where: { bkashPaymentId: paymentId },
    });

    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: "FAILED",
          gatewayResponse: executeResult,
        },
      });
    }

    throw new AppError(
      httpStatus.BAD_GATEWAY,
      executeResult?.statusMessage || "Bkash payment execution failed",
    );
  }

  const transactionResult = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: {
        bkashPaymentId: paymentId,
      },
    });
    if (!payment) {
      throw new AppError(httpStatus.NOT_FOUND, "Payment record not found");
    }
    const manager = await tx.manager.findUnique({
      where: { id: payment.managerId },
    });

    if (!manager) {
      throw new AppError(httpStatus.NOT_FOUND, "Manager not found");
    }
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        transactionId: executeResult.trxID,
        bkashTrxId: executeResult.trxID,
        paidAt: new Date(),
        gatewayResponse: executeResult,
      },
    });
    const startDate = new Date();
    const endDate = addMonths(startDate, 1);
    const subscription = await tx.subscription.upsert({
      where: { managerId: payment.managerId },
      create: {
        managerId: payment.managerId,
        planId: payment.planId!, // fallback — see note below
        status: "ACTIVE",
        startDate,
        endDate,
      },
      update: {
        status: "ACTIVE",
        startDate,
        endDate,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
    });
      await tx.payment.update({
      where: { id: updatedPayment.id },
      data: { subscriptionId: subscription.id },
    });
    return { payment: updatedPayment, subscription };
  });
  return {
    transactionResult,
    redirectUrl: `${config.frontend_url}/dashboard/my-payment?status=success`,
  };
};
const getMyPayment = async () => {}
const getAllPayments = async () => {}
const singlePayment = async () => {}


export const paymentService = {
  createPayment,
  createdPaymentCallBack
};
// TODO
// * Refund
