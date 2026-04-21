import { main } from "../lib/products-l;ambda/handler";
import { getProductById, getProducts } from "../lib/products-l;ambda/products.service";

jest.mock("../lib/products-lambda/products.service", () => ({
  getProductById: jest.fn(),
  getProducts: jest.fn(),
}));

describe("products handler", () => {
  const mockedGetProductById = jest.mocked(getProductById);
  const mockedGetProducts = jest.mocked(getProducts);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns all products when no id is provided", async () => {
    const products = [{ id: 1, name: "Nike shoes", price: 10 }];
    mockedGetProducts.mockResolvedValue(products);

    const result = await main({});

    expect(result).toEqual(products);
    expect(mockedGetProducts).toHaveBeenCalledTimes(1);
    expect(mockedGetProductById).not.toHaveBeenCalled();
  });

  test("returns one product when event.id is provided", async () => {
    const product = { id: 2, name: "Adidas tee", price: 20 };
    mockedGetProductById.mockResolvedValue(product);

    const result = await main({ id: "2" });

    expect(result).toEqual(product);
    expect(mockedGetProductById).toHaveBeenCalledWith(2);
    expect(mockedGetProducts).not.toHaveBeenCalled();
  });

  test("returns one product when pathParameters.id is provided", async () => {
    const product = { id: 3, name: "Puma shorts", price: 30 };
    mockedGetProductById.mockResolvedValue(product);

    const result = await main({ pathParameters: { id: "3" } });

    expect(result).toEqual(product);
    expect(mockedGetProductById).toHaveBeenCalledWith(3);
  });

  test("propagates service errors for invalid ids", async () => {
    const error = new Error("Product with id 999 not found");
    mockedGetProductById.mockRejectedValue(error);

    await expect(main({ id: "999" })).rejects.toThrow("Product with id 999 not found");
    expect(mockedGetProductById).toHaveBeenCalledWith(999);
  });
});