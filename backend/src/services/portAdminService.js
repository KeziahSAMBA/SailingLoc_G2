import prisma from '../config/db.js';
import { departmentFromInsee, regionFromInsee } from '../utils/frenchRegions.js';

function publicPort(p) {
  return {
    id_port: p.id_port,
    name: p.name,
    city: p.city,
    country: p.country,
    department: p.department,
    region: p.region,
    latitude: p.latitude != null ? Number(p.latitude) : null,
    longitude: p.longitude != null ? Number(p.longitude) : null,
    created_at: p.created_at,
    boats_count: p._count ? p._count.boats : undefined,
  };
}

export async function listPorts({ search, region } = {}) {
  const where = { deleted_at: null };
  if (search && String(search).trim()) {
    const s = String(search).trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { city: { contains: s, mode: 'insensitive' } },
    ];
  }
  if (region && String(region).trim()) where.region = String(region).trim();
  const ports = await prisma.port.findMany({
    where,
    include: { _count: { select: { boats: { where: { deleted_at: null } } } } },
    orderBy: { name: 'asc' },
  });
  return ports.map(publicPort);
}

export async function createPort({ name, city, country, latitude, longitude, insee, region }) {
  const cleanName = name && String(name).trim();
  const cleanCity = city && String(city).trim();
  if (!cleanName || !cleanCity) {
    throw Object.assign(new Error('Le nom et la ville du port sont obligatoires.'), {
      status: 400,
    });
  }

  // La région est déduite du code INSEE de la commune (fourni par le catalogue) ;
  // on accepte aussi une valeur explicite en repli.
  const data = {
    name: cleanName,
    city: cleanCity,
    country: (country && String(country).trim()) || 'France',
    department: departmentFromInsee(insee),
    region: regionFromInsee(insee) || (region && String(region).trim()) || null,
    latitude: latitude != null && latitude !== '' ? Number(latitude) : null,
    longitude: longitude != null && longitude !== '' ? Number(longitude) : null,
  };

  // name est unique : un port supprimé garde sa ligne. On le réactive plutôt
  // que de lever un conflit, et on rejette s'il est déjà actif en base.
  const existing = await prisma.port.findUnique({ where: { name: cleanName } });
  if (existing) {
    if (!existing.deleted_at) {
      throw Object.assign(new Error('Ce port est déjà présent en base.'), { status: 409 });
    }
    const revived = await prisma.port.update({
      where: { id_port: existing.id_port },
      data: { ...data, deleted_at: null, updated_at: new Date() },
      include: { _count: { select: { boats: { where: { deleted_at: null } } } } },
    });
    return publicPort(revived);
  }

  const created = await prisma.port.create({
    data,
    include: { _count: { select: { boats: { where: { deleted_at: null } } } } },
  });
  return publicPort(created);
}

export async function deletePort(id_port) {
  const id = Number(id_port);
  const port = await prisma.port.findUnique({
    where: { id_port: id },
    include: { _count: { select: { boats: { where: { deleted_at: null } } } } },
  });
  if (!port || port.deleted_at) {
    throw Object.assign(new Error('Port introuvable.'), { status: 404 });
  }
  if (port._count.boats > 0) {
    throw Object.assign(
      new Error('Impossible de supprimer : des bateaux sont rattachés à ce port.'),
      { status: 409 }
    );
  }
  await prisma.port.update({
    where: { id_port: id },
    data: { deleted_at: new Date(), updated_at: new Date() },
  });
}
