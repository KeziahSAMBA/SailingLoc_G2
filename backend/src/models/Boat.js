export class Boat {
  constructor({
    id,
    title,
    description,
    price,
    location,
    ownerId,
    images = [],
  }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.price = price;
    this.location = location;
    this.ownerId = ownerId;
    this.images = images;
  }
}
