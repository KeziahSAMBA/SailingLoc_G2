import prisma from "../config/db.js";

export async function createBooking({ userId, boatId, startDate, endDate }) {
  return prisma.booking.create({
    data: {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      totalPrice: 0,
      userId,
      boatId,
    },
  });
}
