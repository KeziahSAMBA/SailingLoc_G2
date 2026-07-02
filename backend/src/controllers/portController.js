import prisma from '../config/db.js';

export async function getPorts(req, res) {
  const ports = await prisma.port.findMany({ orderBy: { id_port: 'asc' } });
  res.json(ports);
}
