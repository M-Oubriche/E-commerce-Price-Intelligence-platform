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
    
    # Start everything
    print("Starting process group...")
    nipyapi.canvas.schedule_process_group(root_pg.id, scheduled=True)
    print("NiFi Flow successfully provisioned and started!")

if __name__ == "__main__":
    setup_flow()
