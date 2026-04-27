#!/usr/bin/env python3
import sys
import time

try:
    import nipyapi
except ImportError:
    print("nipyapi not found. Please run: pip install nipyapi")
    sys.exit(1)

def setup_flow():
    # Configure NiFi API connection
    nipyapi.config.nifi_config.host = 'http://localhost:8090/nifi-api'
    
    # Wait for NiFi to be ready
    print("Waiting for NiFi to come online...")
    max_retries = 30
    for i in range(max_retries):
        try:
            root_id = nipyapi.canvas.get_root_pg_id()
            print("Connected to NiFi!")
            break
        except Exception:
            time.sleep(5)
    else:
        print("NiFi is not ready.")
        sys.exit(1)
        
    root_pg = nipyapi.canvas.get_process_group("root")
    
    # Create ListenHTTP Processor
    print("Deploying ListenHTTP processor...")
    listen_http = nipyapi.canvas.create_processor(
        parent_pg=root_pg,
        processor=nipyapi.canvas.get_processor_type('ListenHTTP'),
        location=(0, 0),
        name='Receive JSON from Scraper',
        config=nipyapi.nifi.ProcessorConfigDTO(
            properties={
                'Listening Port': '9090',
                'Base Path': 'contentListener',
                'Return Code': '200'
            }
        )
    )
    
    # Create ExecuteStreamCommand Processor
    print("Deploying ExecuteStreamCommand processor...")
    exec_cmd = nipyapi.canvas.create_processor(
        parent_pg=root_pg,
        processor=nipyapi.canvas.get_processor_type('ExecuteStreamCommand'),
        location=(0, 300),
        name='Ingest to Bigtable via Python',
        config=nipyapi.nifi.ProcessorConfigDTO(
            properties={
                'Command Path': '/opt/nifi/venv/bin/python',
                'Command Arguments': '/opt/nifi/scripts/nifi_ingest.py',
                'Ignore Delineators': 'false'
            },
            auto_terminated_relationships=['original']
        )
    )

    # Create LogAttribute Processor for debugging
    log_attr = nipyapi.canvas.create_processor(
        parent_pg=root_pg,
        processor=nipyapi.canvas.get_processor_type('LogAttribute'),
        location=(0, 600),
        name='Log Successes / Failures',
        config=nipyapi.nifi.ProcessorConfigDTO(
            auto_terminated_relationships=['success']
        )
    )
    
    # Create Connections
    print("Connecting processors...")
    nipyapi.canvas.create_connection(
        source=listen_http,
        target=exec_cmd,
        relationships=['success']
    )
    
    nipyapi.canvas.create_connection(
        source=exec_cmd,
        target=log_attr,
        relationships=['output stream', 'nonzero status']
    )
    
    # --- THE 30-MINUTE TRIGGER FLOW ---
    print("Deploying 30-minute scraper trigger...")
    
    # 1. GenerateFlowFile (The Ticker)
    trigger_gen = nipyapi.canvas.create_processor(
        parent_pg=root_pg,
        processor=nipyapi.canvas.get_processor_type('GenerateFlowFile'),
        location=(500, 0),
        name='Trigger Every 30 Min',
        config=nipyapi.nifi.ProcessorConfigDTO(
            scheduling_period='1800 sec', # 30 minutes
            properties={
                'File Size': '0B',
                'Batch Size': '1'
            }
        )
    )
    
    # 2. ExecuteStreamCommand (The Scraper Launcher)
    # We use /opt/nifi/venv/bin/python and set working dir to /app/scrapers
    scraper_launcher = nipyapi.canvas.create_processor(
        parent_pg=root_pg,
        processor=nipyapi.canvas.get_processor_type('ExecuteStreamCommand'),
        location=(500, 300),
        name='Launch Scraper',
        config=nipyapi.nifi.ProcessorConfigDTO(
            properties={
                'Command Path': '/opt/nifi/venv/bin/python',
                'Command Arguments': '/app/scrapers/main.py',
                'Working Directory': '/app/scrapers'
            },
            auto_terminated_relationships=['original', 'output stream', 'nonzero status']
        )
    )
    
    # Connect Trigger to Launcher
    nipyapi.canvas.create_connection(
        source=trigger_gen,
        target=scraper_launcher,
        relationships=['success']
    )

    # Start everything
    print("Starting process group...")
    nipyapi.canvas.schedule_process_group(root_pg.id, scheduled=True)
    print("NiFi Flow successfully provisioned with 30-min trigger!")

if __name__ == "__main__":
    setup_flow()
