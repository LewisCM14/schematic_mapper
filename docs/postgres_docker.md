1. Start PostgreSQL 16 Docker Container
    - Run this command to start a PostgreSQL 16 container named schematic-postgres:
    ```wsl
    docker run --name schematic-postgres -e POSTGRES_USER=your_db_user -e POSTGRES_PASSWORD=your_db_password -p 5432:5432 -d postgres:16
    ```
    > Replace your_db_user and your_db_password with your desired username and password.The container exposes port 5432 for local access.

2. Connect to the PostgreSQL Container
    - To open a shell in the running container:
    ```
    docker exec -it schematic-postgres bash
    ```

3. Access the PostgreSQL CLI
    - Inside the container, connect as the default user:
    ```
    psql -U your_db_user
    ```

4. Create the Databases
    - Run these SQL commands in the psql prompt:
    ```
    CREATE DATABASE schematic_internal_db;
    CREATE DATABASE schematic_mock_asset_db;
    ```

5. Exit psql and Container
    - Type \q to exit psql, then exit to leave the container shell.

6. Configure Environment Variables
    - In your workspace, create .env with the following (adjust values as needed):
    ```
    SECRET_KEY=your-django-secret-key
    DEBUG=True
    ALLOWED_HOSTS=localhost,127.0.0.1
    CORS_ALLOWED_ORIGINS=http://localhost:5173

    DB_INTERNAL_HOST=127.0.0.1
    DB_INTERNAL_PORT=5432
    DB_INTERNAL_NAME=schematic_internal_db
    DB_INTERNAL_USER=your_db_user
    DB_INTERNAL_PASSWORD=your_db_password

    DB_ASSET_HOST=127.0.0.1
    DB_ASSET_PORT=5432
    DB_ASSET_NAME=schematic_mock_asset_db
    DB_ASSET_USER=your_db_user
    DB_ASSET_PASSWORD=your_db_password
    ```

7. Install Backend Dependencies
    - From your workspace:
    ```
    cd backend
    uv sync
    ```

8. Apply Migrations
    ```
    uv run python manage.py migrate
    ```

9. Seed Test Data
    ```
    uv run python manage.py seed_test_data
    uv run python manage.py setup_mock_asset_db
    ```

10. Start the Backend Server
    ```
    uv run python manage.py runserver
    ```

- You now have the backend running and seeded, ready for the frontend to connect. If you need to seed with custom SQL, you can use:
    ```
    docker exec -i schematic-postgres psql -U your_db_user -d schematic_mock_asset_db < backend/scripts/mock_asset_db.sql
    ```