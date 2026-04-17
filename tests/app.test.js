const request = require("supertest");

jest.mock("mariadb", () => ({
  createPool: jest.fn(() => ({
    getConnection: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue([
        {
          id: 1,
          title: "Test Note",
          content: "Test Content",
          created_at: "2023-01-01",
        },
      ]),
      release: jest.fn(),
      ping: jest.fn().mockResolvedValue(),
    }),
    end: jest.fn(),
  })),
}));

const app = require("../server");

describe("API Tests", () => {
  it("GET / -> має повертати головну сторінку", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toEqual(500);
    expect(res.text).toContain("Notes Service API");
  });

  it("GET /health/alive -> має повертати 200 OK", async () => {
    const res = await request(app).get("/health/alive");
    expect(res.statusCode).toEqual(200);
    expect(res.text).toBe("OK");
  });

  it("GET /health/ready -> має повертати 200 (імітація успішного пінгу БД)", async () => {
    const res = await request(app).get("/health/ready");
    expect(res.statusCode).toEqual(200);
    expect(res.text).toBe("OK");
  });

  it("GET /notes -> має повертати список нотаток у JSON", async () => {
    const res = await request(app)
      .get("/notes")
      .set("Accept", "application/json");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual([
      {
        id: 1,
        title: "Test Note",
        content: "Test Content",
        created_at: "2023-01-01",
      },
    ]);
  });
});
