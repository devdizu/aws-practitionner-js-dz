import { main } from "../lib/lambdas/products-lambda/handler";
import {
  createProduct,
  getProductById,
  getProducts,
} from "../lib/lambdas/products-lambda/products.service";

jest.mock("../lib/lambdas/products-lambda/products.service", () => ({
  createProduct: jest.fn(),
  getProductById: jest.fn(),
  getProducts: jest.fn(),
}));

describe("products handler", () => {
  const mockedCreateProduct = jest.mocked(createProduct);
  const mockedGetProductById = jest.mocked(getProductById);
  const mockedGetProducts = jest.mocked(getProducts);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns all products when no id is provided", async () => {
    const products = [
      { id: "1", title: "Nike shoes", description: "Premium shoes", price: 10 },
    ];
    mockedGetProducts.mockResolvedValue(products);

    const result = await main({});

    expect(result).toEqual(products);
    expect(mockedGetProducts).toHaveBeenCalledTimes(1);
    expect(mockedGetProductById).not.toHaveBeenCalled();
  });

  test("returns one product when event.id is provided", async () => {
    const product = { id: "2", title: "Adidas tee", description: "Comfortable tee", price: 20 };
    mockedGetProductById.mockResolvedValue(product);

    const result = await main({ id: "2" });

    expect(result).toEqual(product);
    expect(mockedGetProductById).toHaveBeenCalledWith("2");
    expect(mockedGetProducts).not.toHaveBeenCalled();
  });

  test("returns one product when pathParameters.id is provided", async () => {
    const product = { id: "3", title: "Puma shorts", description: "Stylish shorts", price: 30 };
    mockedGetProductById.mockResolvedValue(product);

    const result = await main({ pathParameters: { id: "3" } });

    expect(result).toEqual(product);
    expect(mockedGetProductById).toHaveBeenCalledWith("3");
  });

  test("propagates service errors for invalid ids", async () => {
    const error = new Error("Product with id 999 not found");
    mockedGetProductById.mockRejectedValue(error);

    await expect(main({ id: "999" })).rejects.toThrow("Product with id 999 not found");
    expect(mockedGetProductById).toHaveBeenCalledWith("999");
  });

  test("creates one product when method is POST", async () => {
    const payload = { title: "Asics", description: "Running shoe", price: 120 };
    const createdProduct = { id: "10", ...payload };
    mockedCreateProduct.mockResolvedValue(createdProduct);

    const result = await main({ httpMethod: "POST", body: payload });

    expect(result).toEqual(createdProduct);
    expect(mockedCreateProduct).toHaveBeenCalledWith(payload);
    expect(mockedGetProducts).not.toHaveBeenCalled();
    expect(mockedGetProductById).not.toHaveBeenCalled();
  });
});