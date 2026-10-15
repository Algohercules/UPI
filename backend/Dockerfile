# Multi-stage Dockerfile for UPI Offline Mesh Spring Boot Backend

# Stage 1: Build the application JAR
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /build

# Pre-fetch Maven dependencies for caching
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Copy source code and build package
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Minimal, secure JRE runtime
FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

# Install curl for health checking
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Run as non-root user
RUN groupadd -r upi && useradd -r -g upi upi

# Copy JAR from builder stage
COPY --from=builder /build/target/upi-offline-mesh-*.jar /app/app.jar

RUN chown -R upi:upi /app

USER upi:upi

EXPOSE 8080

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
ENV SPRING_PROFILES_ACTIVE="docker"

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:8080/api/server-key || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
