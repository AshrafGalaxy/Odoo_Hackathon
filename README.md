# Expense Management System

An expense reimbursement platform built for the Odoo x Amalthea Hackathon '25. This application streamlines the process of submitting, tracking, and approving employee expenses through a robust and intuitive system.

## Team Members

* Ashraf Ahmed (@ VIT Pune)
* Aadesh Deshmukh (@ VIT Pune)
* Ayush Deshmukh (@ VIT Pune)
* Yogeshwar Shinde (@ VIT Pune)

## Core Features

* **User Authentication**: Implemented a secure, JWT-based authentication system with three distinct roles: Admin, Manager, and Employee.
* **Expense Submission**: Employees can submit expense claims with different amounts and currencies, along with a category and description.
* **Approval Workflow**: A multi-level approval process is in place, where expenses are first sent to a manager and can be forwarded to additional approvers.
* **Automated OCR**: Employees can upload a receipt, and the system uses an OCR algorithm to automatically read and fill in the expense amount.
* **Currency Conversion**: Managers and Directors can view expenses in their company's base currency, with real-time conversion from the submitted currency.
* **Professional UI/UX**: The application features a clean, responsive interface with custom notifications, loading states, and modals for a smooth user experience.

## Tech Stack

* **Backend**: Node.js, Express.js
* **Database**: PostgreSQL
* **Frontend**: Vanilla HTML, CSS, JavaScript

## Getting Started

### Prerequisites

* Node.js
* PostgreSQL

### How to Run the Project

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/AshrafGalaxy/Odoo_Hackathon.git](https://github.com/AshrafGalaxy/Odoo_Hackathon.git)
    cd Odoo_Hackathon
    ```

2.  **Install backend dependencies:**
    ```bash
    cd server
    npm install
    ```

3.  **Configure your database:**
    * Create a `.env` file in the `server` directory.
    * Add your PostgreSQL connection details as shown below.

    ```
    DB_USER=your_user
    DB_HOST=localhost
    DB_DATABASE=database_name
    DB_PASSWORD=your_password
    DB_PORT=5432
    JWT_SECRET=this-is-my-secret
    ```

4.  **Set up the database schema:**
    * Run the SQL commands from `database.sql` on your PostgreSQL server.

5.  **Start the server:**
    ```bash
    npm run dev
    ```

6.  **Access the application:**
    * Open `client/index.html` in your web browser.