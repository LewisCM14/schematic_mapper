
# Deployment Guide: Schematic Mapper on Windows Server 2022 with IIS

This guide provides a detailed, step-by-step process for deploying the Schematic Mapper application (Django backend + React frontend) to Windows Server 2022 using IIS. It is tailored to your project’s requirements, security, and enterprise integration needs.

---

## Prerequisites

- Windows Server 2022 (with admin access)
- IIS (Internet Information Services) installed
- Python 3.12 or newer (64-bit, matching your dev environment)
- Conda (Miniconda or Anaconda, preferred for Python environment management)
- Node.js (LTS, 64-bit)
- PostgreSQL or MSSQL (as per production DB choice)
- Git (for code checkout)
- Visual C++ Build Tools (for Python package compilation)
- [wfastcgi](https://pypi.org/project/wfastcgi/) (for Django/IIS integration)
- Service account(s) for app pool and DB access (recommended)

---

## 1. Prepare the Windows Server

### 1.1. Install IIS and Required Features
1. Open **Server Manager** > **Add roles and features**.
2. Select **Web Server (IIS)**.
3. Under **Web Server > Application Development**, enable:
	 - **CGI**
	 - **ISAPI Extensions**
	 - **ISAPI Filters**
	 - **WebSockets** (if needed)
4. Under **Security**, enable **Windows Authentication**.
5. Complete the wizard and restart if prompted.

### 1.2. Install Python 3.13 (64-bit)
1. Download and install [Miniconda](https://docs.conda.io/en/latest/miniconda.html) or [Anaconda](https://www.anaconda.com/products/distribution) (64-bit) as Administrator.
2. (If not using conda) Download Python 3.12+ from python.org and install for all users.
3. Add Python/conda to PATH if prompted.
4. Open a new Command Prompt and verify with `conda --version` and `python --version`.

### 1.3. Install Node.js (LTS)
1. Download Node.js LTS (64-bit) from nodejs.org.
2. Install for all users.
3. Verify with `node -v` and `npm -v`.

### 1.4. Install Visual C++ Build Tools
1. Download and install [Build Tools for Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
2. Select **C++ build tools** and install.

### 1.5. Install PostgreSQL or MSSQL Client Tools
1. Install the appropriate ODBC drivers and client tools for your database (PostgreSQL or MSSQL).
2. Test DB connectivity from the server.

---

## 2. Prepare the Application Code

### 2.1. Clone the Repository
1. Open Command Prompt or PowerShell as Administrator.
2. `git clone <your-repo-url> C:\schematic_mapper`
3. `cd C:\schematic_mapper`

### 2.2. Set Up Python Virtual Environment
1. `cd backend`
2. Create a new conda environment (recommended):
	- `conda create -n schematic python=3.12`
	- `conda activate schematic`
3. Install dependencies:
	- `pip install --upgrade pip`
	- `pip install -r requirements.txt`
	- (If using uv: `uv sync`)
4. (If not using conda) Use `python -m venv .venv` and activate as per previous instructions.

### 2.3. Install wfastcgi
1. `pip install wfastcgi`
2. `python -m wfastcgi.enable`
	- This registers wfastcgi handler with IIS.
	- If using conda, ensure the conda environment is activated when running these commands.

### 2.4. Configure Environment Variables
1. Copy your `.env` file to `C:\schematic_mapper\backend`.
2. For production, set `AUTH_MODE` to production (not `dev`).
3. Set DB credentials, secret key, allowed hosts, etc.
4. For security, use Windows environment variables or IIS App Pool variables for secrets.

### 2.5. Apply Migrations and Seed Data
1. `cd backend`
2. `conda activate schematic` (or activate your venv)
3. `python manage.py migrate`
4. `python manage.py seed_test_data` (optional, for initial data)

---

## 3. Build the React Frontend

### 3.1. Install Frontend Dependencies
1. `cd C:\schematic_mapper\frontend`
2. `npm install`

### 3.2. Build for Production
1. `npm run build`
2. The static files will be output to `C:\schematic_mapper\frontend\dist`

---

## 4. Configure IIS for Django Backend

### 4.1. Create Application Pool
1. Open **IIS Manager**.
2. Go to **Application Pools**.
3. Create a new pool (e.g., `SchematicMapperAppPool`).
4. Set .NET CLR version to **No Managed Code**.
5. Set **Identity** to a service account with DB/file access (recommended).

### 4.2. Create IIS Site for Backend API
1. In **Sites**, add a new site (e.g., `SchematicMapperAPI`).
2. Set the physical path to `C:\schematic_mapper\backend`.
3. Bind to the desired hostname and port (e.g., `api.schematic.local:8000`).
4. Assign the site to the `SchematicMapperAppPool`.

### 4.3. Configure FastCGI for Python
1. In **IIS Manager**, go to the site > **Handler Mappings**.
2. Add Module Mapping:
	 - **Request path:** `*`
	 - **Module:** `FastCgiModule`
	 - **Executable:** `C:\schematic_mapper\backend\.venv\Scripts\python.exe|C:\schematic_mapper\backend\.venv\Lib\site-packages\wfastcgi.py`
	 - **Name:** `Python via wfastcgi`
3. Set **Request Restrictions** to allow all verbs and script access.

### 4.4. Configure web.config for Django
1. In `C:\schematic_mapper\backend`, create or edit `web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
	<system.webServer>
		<handlers>
			<add name="PythonHandler" path="*" verb="*" modules="FastCgiModule" scriptProcessor="C:\schematic_mapper\backend\.venv\Scripts\python.exe|C:\schematic_mapper\backend\.venv\Lib\site-packages\wfastcgi.py" resourceType="Unspecified" requireAccess="Script" />
		</handlers>
		<security>
			<authentication>
				<windowsAuthentication enabled="true" />
				<anonymousAuthentication enabled="false" />
			</authentication>
		</security>
		<defaultDocument>
			<files>
				<clear />
			</files>
		</defaultDocument>
		<httpErrors errorMode="Detailed" />
		<asp scriptErrorSentToBrowser="true" />
	</system.webServer>
	<appSettings>
		<add key="WSGI_HANDLER" value="config.wsgi.application" />
		<add key="DJANGO_SETTINGS_MODULE" value="config.settings" />
		<add key="PYTHONPATH" value="C:\schematic_mapper\backend" />
		<add key="DJANGO_ALLOW_ASYNC_UNSAFE" value="true" />
	</appSettings>
</configuration>
```

### 4.5. Static and Media Files
1. Collect static files:
	- `python manage.py collectstatic --noinput`
	- (Ensure your conda environment is activated if using conda)
2. Configure IIS to serve static files from `C:\schematic_mapper\backend\static` and media from `C:\schematic_mapper\backend\media`.
3. Add static file handler mappings in IIS if needed.

---

## 5. Configure IIS for React Frontend

### 5.1. Create Application Pool (Optional)
1. You may use the same or a separate app pool for the frontend.

### 5.2. Create IIS Site for Frontend
1. In **Sites**, add a new site (e.g., `SchematicMapperUI`).
2. Set the physical path to `C:\schematic_mapper\frontend\dist`.
3. Bind to the desired hostname and port (e.g., `schematic.local:80`).
4. Assign to the app pool.

### 5.3. Configure Static File Serving
1. Ensure **Static Content** role service is enabled in IIS.
2. Set default document to `index.html`.
3. Configure CORS to allow API calls to the backend domain.

### 5.4. (Optional) Reverse Proxy API Calls
1. If you want `/api` calls from the frontend to be proxied to the backend, use the **URL Rewrite** module.
2. Add a rule to forward `/api/*` requests to the backend site.

---

## 6. SSL/TLS Configuration

### 6.1. Obtain and Install SSL Certificate
1. Use your enterprise CA or a public CA to obtain a certificate for your domains.
2. Import the certificate into the Windows certificate store.

### 6.2. Bind SSL to IIS Sites
1. In **IIS Manager**, select each site.
2. Click **Bindings** > **Add** > select `https` and choose the certificate.
3. Require SSL for both frontend and backend sites.

---

## 7. Windows Authentication & Active Directory Integration

### 7.1. Enable Windows Authentication
1. In **IIS Manager**, select the backend site.
2. Open **Authentication**.
3. Enable **Windows Authentication**; disable **Anonymous Authentication**.

### 7.2. Configure REMOTE_USER for Django
1. Django will receive the authenticated user via the `REMOTE_USER` environment variable.
2. Your middleware should extract this and perform LDAP group lookup as per your plan/spec.

### 7.3. (Optional) Configure LDAP/AD Access
1. Ensure the app pool identity has permission to query AD via LDAP/LDAPS.
2. Configure firewall rules to allow LDAPS to your domain controllers.

---

## 8. Final Steps and Testing

### 8.1. Restart IIS
1. `iisreset` from an elevated command prompt.

### 8.2. Test End-to-End
1. Access the frontend site in Edge/Chrome.
2. Verify static file serving, React routing, and API calls.
3. Test authentication: users should be auto-logged in via Windows Auth.
4. Test admin and viewer roles (AD group membership).
5. Check logs for errors in Django, IIS, and Windows Event Viewer.

### 8.3. Troubleshooting
- Use `wfastcgi` logs and Django logs for backend errors.
- Use browser dev tools and IIS logs for frontend/API issues.
- Ensure all environment variables and secrets are set correctly.
- Validate DB connectivity and permissions.

---

## 9. Maintenance & Security

- Regularly patch Windows, IIS, Python, Node.js, and all dependencies.
- Rotate secrets and certificates as per policy.
- Monitor logs and set up alerting for errors or suspicious activity.
- Review AD group membership and permissions regularly.

---

**This guide is tailored for the Schematic Mapper project and should be reviewed and adapted for your specific enterprise environment and security requirements.**

---

**Notes:**
- Python 3.12 or newer is supported (not strictly 3.13).
- Conda is the recommended environment manager for this project; all commands assume conda is used unless otherwise specified.
- If using a different environment manager (e.g., venv, uv), adjust commands accordingly.
