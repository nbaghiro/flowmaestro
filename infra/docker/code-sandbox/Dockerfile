# FlowMaestro Code Sandbox Image
#
# Pre-built Docker image with Python 3.11, Node.js 20, and common packages
# for secure code execution in isolated containers.
#
# Build: docker build -t flowmaestro/code-sandbox:latest .
# Push:  docker push flowmaestro/code-sandbox:latest

FROM python:3.11-slim-bookworm

# Install Node.js 20.x
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install additional system dependencies for common Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libssl-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for code execution
RUN groupadd -r sandbox && useradd -r -g sandbox -d /home/sandbox -m sandbox

# Set working directory
WORKDIR /sandbox

# Copy and install Python packages
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt \
    && rm /tmp/requirements.txt

# Copy and install Node.js packages
COPY package.json /tmp/package.json
RUN cd /tmp && npm install --omit=dev \
    && mkdir -p /sandbox/node_modules \
    && mv /tmp/node_modules/* /sandbox/node_modules/ \
    && rm -rf /tmp/package.json /tmp/package-lock.json /tmp/node_modules

# Set permissions for sandbox directory
RUN chown -R sandbox:sandbox /sandbox

# Switch to non-root user
USER sandbox

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV NODE_PATH=/sandbox/node_modules
ENV PATH="/sandbox/node_modules/.bin:${PATH}"

# Default command (will be overridden by docker exec)
CMD ["sleep", "infinity"]
