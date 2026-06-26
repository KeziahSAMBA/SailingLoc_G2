import prisma from '../config/db.js';
import { createBooking } from '../services/bookingService.js';

const BOAT_INCLUDE = {
  port: true,
  images: { orderBy: { order: 'asc' } },
  availabilities: {
    where: { is_available: true },
    orderBy: { start_date: 'asc' },
  },
  bookings: {
    select: {
      reviews: {
        where: { status: 'validated', deleted_at: null },
        select: { rating: true },
      },
    },
  },
};

function enrichWithRating(boats) {
  return boats.map((b) => {
    const allReviews = b.bookings.flatMap((bk) => bk.reviews);
    const avg =
      allReviews.length > 0
        ? Math.round((allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length) * 10) / 10
        : null;
    const { bookings, ...boat } = b;
    return { ...boat, avg_rating: avg };
  });
}

export async function getBoats(req, res) {
  const boats = await prisma.boat.findMany({
    where: { is_published: true },
    include: BOAT_INCLUDE,
  });

  res.json(enrichWithRating(boats));
}

export async function getBoatsByType(req, res) {
  const boats = await prisma.boat.findMany({
    where: { is_published: true },
    include: BOAT_INCLUDE,
    orderBy: { id_boat: 'asc' },
  });

  const enriched = enrichWithRating(boats);

  // Group by type, keep at most 3 boats per type
  const groups = {};
  for (const boat of enriched) {
    if (!groups[boat.type]) groups[boat.type] = [];
    if (groups[boat.type].length < 3) groups[boat.type].push(boat);
  }

  const sections = Object.entries(groups)
    .filter(([, list]) => list.length > 0)
    .map(([type, list]) => ({ type, boats: list }));

  res.json(sections);
}

export async function uploadBoat(req, res) {
  const { title, description, price, location } = req.body;
  const ownerId = req.user?.id_user;

  if (!ownerId) {
    return res.status(401).json({ message: 'Owner required' });
  }

  const images = req.files ? req.files.map((file) => file.filename) : [];

  const boat = await prisma.boat.create({
    data: {
      title,
      description,
      price: Number(price),
      location,
      ownerId,
      images,
    },
  });

  res.status(201).json(boat);
}

export async function createBookingController(req, res) {
  const { boatId, startDate, endDate } = req.body;
  const userId = req.user?.id_user;
  const booking = await createBooking({ userId, boatId, startDate, endDate });
  res.status(201).json(booking);
}
