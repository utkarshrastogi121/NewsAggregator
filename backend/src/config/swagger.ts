import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AI News Aggregator API",
      version: "1.0.0",
      description:
        "API documentation for AI-powered news aggregation platform"
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local server"
      }
    ],
    components:{
    securitySchemes:{
      bearerAuth:{
        type:"http",
        scheme:"bearer",
        bearerFormat:"JWT"
      }
    }
  }
  },
  apis: ["./src/**/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
  );
}