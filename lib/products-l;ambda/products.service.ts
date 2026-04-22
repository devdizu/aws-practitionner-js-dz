const products = [
  { id: 1, title: "Nike shoes", description: 'A great pair of Nike shoes', price: 10 },
  { id: 2, title: "Adidas tee", description: 'A comfortable Adidas tee', price: 20 },
  { id: 3, title: "Puma shorts", description: 'Stylish Puma shorts', price: 30 },
  { id: 4, title: "Reebok hoodie", description: 'Cozy Reebok hoodie', price: 40 },
  { id: 5, title: "Under Armour cap", description: 'Durable Under Armour cap', price: 50 },
  { id: 6, title: "New Balance socks", description: 'Soft New Balance socks', price: 60 },
  { id: 7, title: "Asics running shoes", description: 'High-performance Asics running shoes', price: 70 },
  { id: 8, title: "Columbia jacket", description: 'Waterproof Columbia jacket', price: 80 },
  { id: 9, title: "The North Face backpack", description: 'Spacious The North Face backpack', price: 90 },
];

export function getProducts() {
  return new Promise((resolve) => {
    resolve(products);
  });
};

export function getProductById(id: number) {
  return new Promise((resolve, reject) => {
    const product = products.find((p) => p.id === id);
    if (!product) {
      reject(new Error(`Product with id ${id} not found`));
    } else {
      resolve(product);
    }
  });
};
