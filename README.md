# ParlanceChat

A real-time team chat web application inspired by Slack, enabling seamless communication through channels, direct messages, and group chats. Features include WebSocket-based messaging, user presence indicators, and a modern dark-mode UI.

## Tech Stack

- **Frontend:** React (with Tailwind CSS for styling, Framer Motion for animations, and Shadcn UI components)
- **Backend Proxy:** Node.js (FastAPI server acting as a proxy to Spring Boot)
- **WebSocket & API Server:** Spring Boot (Java, handling real-time messaging and REST APIs)
- **Memory/AI Integration:** Python (for memory management and potential AI features)
- **Database:** (Assumed to be integrated in Spring Boot, e.g., H2 or external DB)
- **Testing:** Pytest for Python backend, Jest for React frontend

## Prerequisites

Before running the application, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **Python** (3.8 or higher) - [Download here](https://www.python.org/)
- **Java** (JDK 11 or higher) - [Download here](https://adoptium.net/)
- **Maven** (for building Spring Boot) - [Download here](https://maven.apache.org/)
- **Git** (for cloning the repository)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ParlanceChat
```

### 2. Frontend Setup

The frontend is a React application.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `frontend` directory with the following variables:
   ```
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```

4. Start the development server:
   ```bash
   npm start
   ```
   The app will run on `http://localhost:3000`.

### 3. Backend Proxy Setup

The backend proxy is a Python FastAPI server that forwards requests to the Spring Boot server.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set environment variables (optional, defaults are set):
   - `FRONTEND_URL`: URL of the frontend (default: `http://localhost:3000`)
   - `JAR_PATH`: Path to the Spring Boot JAR (default: `/app/springboot/target/parlance-0.0.1-SNAPSHOT.jar`)

4. Run the proxy server:
   ```bash
   python server.py
   ```
   The proxy runs on `http://localhost:8001` and starts the Spring Boot JAR on port 8002.

### 4. Spring Boot Setup

The Spring Boot application handles WebSocket connections and API endpoints.

1. Navigate to the springboot directory:
   ```bash
   cd springboot
   ```

2. Build the application:
   ```bash
   mvn clean install
   ```

3. Set environment variables in `src/main/resources/application.properties` or via command line:
   - `server.port=8002`
   - `app.jwt.secret=<your-jwt-secret>`
   - Database configuration (if applicable)

4. Run the application:
   ```bash
   mvn spring-boot:run
   ```
   The server runs on `http://localhost:8002`.

### 5. Memory/AI Setup (Optional)

The memory folder contains Python scripts for memory management.

1. Navigate to the memory directory:
   ```bash
   cd memory
   ```

2. Install any required Python packages (if `requirements.txt` exists):
   ```bash
   pip install -r requirements.txt
   ```

3. Run memory-related scripts as needed (refer to individual files for usage).

## Environment Variables

- **Frontend (.env in frontend/):**
  - `REACT_APP_BACKEND_URL`: URL of the backend proxy (default: `http://localhost:8001`)

- **Backend (environment or .env):**
  - `FRONTEND_URL`: Frontend URL for CORS (default: `http://localhost:3000`)
  - `JAR_PATH`: Path to Spring Boot JAR

- **Spring Boot (application.properties):**
  - `app.jwt.secret`: Secret key for JWT tokens
  - Database connection strings, etc.

## Running Tests

### Frontend Tests

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Run tests:
   ```bash
   npm test
   ```

### Backend Tests

1. Navigate to the tests directory:
   ```bash
   cd tests
   ```

2. Run Python tests:
   ```bash
   pytest
   ```

Test results are stored in `test_reports/` and `tests/pytest/`.

## Folder Structure

```
ParlanceChat/
├── design_guidelines.json          # (Removed after migration)
├── README.md                       # This file
├── test_result.md                  # Test results summary
├── frontend/                       # React frontend
│   ├── public/
│   │   ├── index.html              # HTML template with Google Fonts
│   │   └── ...
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   ├── contexts/               # React contexts (Auth, Chat)
│   │   ├── hooks/                  # Custom hooks
│   │   ├── lib/                    # Utilities
│   │   ├── pages/                  # Page components
│   │   ├── utils/                  # Helper functions
│   │   └── design-tokens.js        # Design system tokens
│   ├── package.json
│   ├── tailwind.config.js          # Tailwind config with custom colors/fonts
│   └── ...
├── backend/                        # Python proxy server
│   ├── requirements.txt
│   ├── server.py                   # FastAPI proxy to Spring Boot
│   └── ...
├── springboot/                     # Java Spring Boot application
│   ├── pom.xml
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/               # Java source code
│   │   │   └── resources/          # Config files
│   │   └── target/                 # Build output
│   └── ...
├── memory/                         # Python memory/AI scripts
├── test_reports/                   # Test output reports
└── tests/                          # Python test files
    ├── __init__.py
    └── test_parlance.py
```

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make changes and run tests.
4. Submit a pull request.

## License

[Add license information here, e.g., MIT]
