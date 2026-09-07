import httpStatus from "http-status";
import { ReqUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { prisma } from "../../lib/prisma";
import { addMonths } from "date-fns";
import { getBkashIdToken } from "../../lib/bkash";
import { config } from "../../config";
import { logActivity } from "../../utils/logActivity";
import PDFDocument from "pdfkit";
import { transporter } from "../../lib/nodemailer";

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

        callbackURL: `${config.bkash_callback_url}/payment/callback`,
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

  await logActivity({
    actorUserId: user.userId,
    action: "Payment created",
    entityType: "Payment",
    entityId: payment.id,
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
const sendSubscriptionInvoice = async (invoice: {
  managerName: string;
  managerEmail: string;
  startDate: Date;
  endDate: Date;
  status: string;
  amount: unknown;
  transactionId: string;
  paidAt: Date | null;
}) => {
  const pdfDocument = new PDFDocument({ margin: 50 });
  const pdfChunks: Buffer[] = [];

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    pdfDocument.on("data", (chunk: Buffer) => pdfChunks.push(chunk));
    pdfDocument.on("end", () => resolve(Buffer.concat(pdfChunks)));
    pdfDocument.on("error", reject);

    pdfDocument
      .fontSize(20)
      .text("Sprintly Project Management App", { align: "center" });
    pdfDocument.fontSize(14).text("Subscription Invoice", { align: "center" });
    pdfDocument.moveDown(2);

    pdfDocument.fontSize(12).text(`Manager Name: ${invoice.managerName}`);
    pdfDocument.text(`Manager Email: ${invoice.managerEmail}`);
    pdfDocument.moveDown();
    pdfDocument.text(`Subscription Start: ${invoice.startDate}`);
    pdfDocument.text(`Subscription End: ${invoice.endDate}`);
    pdfDocument.text(`Subscription Status: ${invoice.status}`);
    pdfDocument.moveDown();
    pdfDocument.text(`Amount Paid: ${invoice.amount} BDT`);
    pdfDocument.text("Payment Method: BKash");
    pdfDocument.text(`Transaction Id: ${invoice.transactionId}`);
    pdfDocument.text(`Paid At: ${invoice.paidAt}`);
    pdfDocument.end();
  });

  await transporter.sendMail({
    from: config.email_sender,
    to: invoice.managerEmail,
    subject: "Your Subscription Invoice - Sprintly Project Management App",
    text: "Thank you for subscribing, Please find your invoice attached",
    attachments: [
      {
        filename: `${invoice.managerEmail}_invoice.pdf`,
        content: pdfBuffer,
      },
    ],
  });
};

const createdPaymentCallBack = async (query: Record<string, any>) => {
  const failureRedirect = `${config.frontend_url}/dashboard/my-payment?status=failure`;
  const cancelRedirect = `${config.frontend_url}/dashboard/my-payment?status=cancel`;
  const successRedirect = `${config.frontend_url}/dashboard/my-payment?status=success`;

  const paymentId = query.paymentID as string | undefined;
  const status = query.status as string | undefined;

  if (!paymentId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Payment ID missing");
  }

  if (!status) {
    throw new AppError(httpStatus.BAD_REQUEST, "Payment status missing");
  }

  let executeResult: Record<string, any> | undefined;

  // Only successful callbacks need bKash execution. Failure/cancel callbacks
  // can update the local payment immediately without another network request.
  if (status === "success") {
    const bkashIdToken = await getBkashIdToken();

    if (!bkashIdToken) {
      throw new AppError(httpStatus.BAD_GATEWAY, "No Bkash access token found");
    }

    const bkashHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: bkashIdToken,
      "X-App-Key": config.bkash_app_key,
    };
    const executeResponse = await fetch(
      `${config.bkash_sandbox_base_url}/tokenized/checkout/execute`,
      {
        method: "POST",
        headers: bkashHeaders,
        body: JSON.stringify({ paymentID: paymentId }),
        signal: AbortSignal.timeout(10000),
      },
    );

    executeResult = await executeResponse.json();

    if (!executeResponse.ok) {
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        executeResult?.statusMessage || "Failed to execute Bkash payment",
      );
    }
  }

  const transactionResult = await prisma.$transaction(
    async (tx) => {
      if (status === "success") {
        if (!executeResult) {
          throw new AppError(
            httpStatus.BAD_GATEWAY,
            "Missing bKash execution response",
          );
        }

        const payment = await tx.payment.findFirst({
          where: { bkashPaymentId: paymentId },
          include: {
            manager: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        });

        if (!payment) {
          throw new AppError(httpStatus.NOT_FOUND, "Payment record not found");
        }

        if (!payment.planId) {
          throw new AppError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "Payment has no associated plan",
          );
        }

        const startDate = new Date();
        const endDate = addMonths(startDate, 1);

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESS",
            transactionId: executeResult.trxID,
            bkashTrxId: executeResult.trxID,
            paidAt: new Date(),
            gatewayResponse: executeResult,
          },
        });

        const subscription = await tx.subscription.upsert({
          where: { managerId: payment.managerId },
          create: {
            managerId: payment.managerId,
            planId: payment.planId,
            status: "ACTIVE",
            startDate,
            endDate,
          },
          update: {
            planId: payment.planId,
            status: "ACTIVE",
            startDate,
            endDate,
            cancelAtPeriodEnd: false,
            canceledAt: null,
          },
        });

        await tx.payment.update({
          where: { id: payment.id },
          data: { subscriptionId: subscription.id },
        });
        return {
          redirectUrl: successRedirect,
          invoice: {
            managerName: payment.manager.name,
            managerEmail: payment.manager.email,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            status: subscription.status,
            amount: payment.amount,
            transactionId: executeResult!.trxID,
            paidAt: new Date(),
          },
        };
      } else if (status === "failure") {
        await tx.payment.updateMany({
          where: { bkashPaymentId: paymentId },
          data: {
            status: "FAILED",
            gatewayResponse: executeResult,
          },
        });

        return { redirectUrl: failureRedirect };
      } else if (status === "cancel") {
        await tx.payment.updateMany({
          where: { bkashPaymentId: paymentId },
          data: {
            status: "CANCELLED",
            gatewayResponse: executeResult,
          },
        });

        return { redirectUrl: cancelRedirect };
      } else {
        return { redirectUrl: failureRedirect };
      }
    },
    {
      maxWait: 10000, // wait up to 10s to acquire a connection
      timeout: 10000,
    },
  );

  if (transactionResult.invoice) {
    void sendSubscriptionInvoice(transactionResult.invoice).catch((error) => {
      console.error("Failed to send subscription invoice", error);
    });
  }

  const callbackPayment = await prisma.payment.findFirst({
    where: { bkashPaymentId: query.paymentID as string | undefined },
    include: { manager: { select: { userId: true } } },
  });

  if (
    callbackPayment &&
    ["success", "failure", "cancel"].includes(query.status)
  ) {
    await logActivity({
      actorUserId: callbackPayment.manager.userId,
      action: `Payment ${query.status}`,
      entityType: "Payment",
      entityId: callbackPayment.id,
    });
  }

  return transactionResult;
};
const getMyPayment = async (user: ReqUser) => {
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

  const payment = await prisma.payment.findMany({
    where: {
      managerId: manager.id,
    },
    include: {
      manager: {
        select: {
          email: true,
          name: true,
        },
      },
      subscription: {
        select: {
          status: true,
          startDate: true,
          endDate: true,
        },
      },
    },
    omit: {
      gatewayResponse: true,
    },
  });

  return payment;
};

export const paymentService = {
  createPayment,
  createdPaymentCallBack,
  getMyPayment,
};
