import prisma from '../config/db.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

const PUBLIC_PORT_SELECT = {
  id_port: true,
  name: true,
  city: true,
  country: true,
  department: true,
  region: true,
  latitude: true,
  longitude: true,
  image_url: true,
};

function publicPort(port) {
  return {
    id_port: port.id_port,
    name: port.name,
    city: port.city,
    country: port.country,
    department: port.department,
    region: port.region,
    latitude: port.latitude,
    longitude: port.longitude,
    image_url: port.image_url,
  };
}

export async function getPorts(req, res) {
  try {
    const ports = await prisma.port.findMany({
      where: { deleted_at: null },
      select: PUBLIC_PORT_SELECT,
      orderBy: { id_port: 'asc' },
    });
    res.json(ports.map(publicPort));
  } catch (err) {
    return sendError(res, err);
  }
}
