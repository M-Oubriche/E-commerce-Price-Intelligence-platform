FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY notebooks/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create a non-root user for security (optional but good practice)
RUN useradd -ms /bin/bash jupyter_user
USER jupyter_user
WORKDIR /home/jupyter_user/notebooks

EXPOSE 8888

# Start JupyterLab without token for easy local dev
CMD ["jupyter", "lab", "--ip=0.0.0.0", "--port=8888", "--no-browser", "--NotebookApp.token=''", "--NotebookApp.password=''"]
