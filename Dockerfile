# Use the Eclipse Temurin JDK 21 as the base image
FROM eclipse-temurin:21-jdk

# Set the working directory in the container
WORKDIR /app

# Copy the packaged jar file into the container at /app
COPY target/dashboard-*.jar /app/app.jar

# Make port 9999 available to the world outside this container
EXPOSE 9999

# Run the jar file
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
