// app.js: Frontend logic to handle UI, API calls, and state management.

document.addEventListener("DOMContentLoaded", () => {
  // --- Constants and State ---
  const API_BASE_URL = "http://localhost:3000/api";
  const token = localStorage.getItem("token");

  // UI Elements
  const authView = document.getElementById("auth-view");
  const appView = document.getElementById("app-view");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const expenseForm = document.getElementById("expense-form");
  const showRegisterLink = document.getElementById("show-register-link");
  const showLoginLink = document.getElementById("show-login-link");
  const logoutBtn = document.getElementById("logout-btn");

  // Dashboards
  const employeeDashboard = document.getElementById("employee-dashboard");
  const managerDashboard = document.getElementById("manager-dashboard");
  const adminDashboard = document.getElementById("admin-dashboard");

  // --- Core Functions ---
  const navigateTo = (view) => {
    document
      .querySelectorAll(".view")
      .forEach((v) => (v.style.display = "none"));
    document.getElementById(view).style.display = "block";
  };

  const fetchAPI = async (endpoint, method = "GET", body = null) => {
    const headers = { "Content-Type": "application/json" };
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config = { method, headers };
    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Something went wrong");
      }
      return response.json();
    } catch (error) {
      showNotification(error.message, "error");
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigateTo("auth-view");
  };

  // --- NEW NOTIFICATION FUNCTION GOES HERE ---
  function showNotification(message, type) {
    const notification = document.getElementById("notification");
    notification.textContent = message;

    // Set the class for color (success or error)
    notification.className = type;

    // Animate it into view
    notification.classList.add("show");

    // Automatically hide it after 3 seconds
    setTimeout(() => {
      notification.classList.remove("show");
    }, 3000);
  }

  const initializeDashboard = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      logout();
      return;
    }

    document.getElementById("user-name").textContent = user.role;
    navigateTo("app-view");

    // Hide all dashboards initially
    employeeDashboard.style.display = "none";
    managerDashboard.style.display = "none";
    adminDashboard.style.display = "none";

    // Show dashboard based on role
    if (user.role === "employee") {
      employeeDashboard.style.display = "block";
      loadEmployeeExpenses();
    } else if (user.role === "manager" || user.role === "director") {
      managerDashboard.style.display = "block";
      loadPendingApprovals();
    } else if (user.role === "admin") {
      adminDashboard.style.display = "block";
      loadUserManagement();
    }
  };

  // --- Data Loading Functions ---
  async function loadEmployeeExpenses() {
    const expenses = await fetchAPI("/expenses/my-expenses");
    const tableContainer = document.getElementById("expense-history-table");
    if (expenses) {
      // NEW: Check if the expenses array is empty
      if (expenses.length === 0) {
        tableContainer.innerHTML = "<p>You have no submitted expenses.</p>";
        return; // Stop the function here
      }

      let tableHTML =
        "<table><tr><th>Category</th><th>Amount</th><th>Status</th></tr>";
      expenses.forEach((exp) => {
        tableHTML += `<tr><td>${exp.category}</td><td>${exp.amount} ${exp.currency}</td><td class="status-${exp.status}">${exp.status}</td></tr>`;
      });
      tableHTML += "</table>";
      tableContainer.innerHTML = tableHTML;
    }
  }
  async function loadPendingApprovals() {
    const expenses = await fetchAPI("/expenses/pending");
    const tableContainer = document.getElementById("pending-approvals-table");
    if (expenses) {
      // NEW: Check if the expenses array is empty
      if (expenses.length === 0) {
        tableContainer.innerHTML =
          "<p>There are no expenses waiting for your approval.</p>";
        return; // Stop the function here
      }

      let tableHTML =
        "<table><tr><th>Employee</th><th>Category</th><th>Amount</th><th>Actions</th></tr>";
      expenses.forEach((exp) => {
        let amountDisplay = `${parseFloat(exp.amount).toFixed(2)} ${
          exp.currency
        }`;
        if (exp.convertedAmount) {
          amountDisplay += ` (approx. ${exp.convertedAmount} ${exp.baseCurrency})`;
        }

        tableHTML += `
                <tr>
                    <td>${exp.employee_name}</td>
                    <td>${exp.category}</td>
                    <td>${amountDisplay}</td> 
                    <td>
                        <button class="approve-btn" data-id="${exp.id}">Approve</button>
                        <button class="reject-btn" data-id="${exp.id}">Reject</button>
                    </td>
                </tr>`;
      });
      tableHTML += "</table>";
      tableContainer.innerHTML = tableHTML;
    }
  }
  async function loadUserManagement() {
    const users = await fetchAPI("/admin/users");
    const tableContainer = document.getElementById("user-management-table");
    if (users) {
      let tableHTML =
        "<table><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr>";
      users.forEach((user) => {
        tableHTML += `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td>${
                      user.is_special_approver
                        ? "<strong>Special Approver</strong>"
                        : ""
                    }</td>
                    <td>
                        ${
                          !user.is_special_approver
                            ? `<button class="set-special-btn" data-id="${user.id}">Set as Special</button>`
                            : ""
                        }
                    </td>
                </tr>`;
      });
      tableHTML += "</table>";
      tableContainer.innerHTML = tableHTML;
    }
  }

  // --- Event Listeners ---
  showRegisterLink.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("login-form-container").style.display = "none";
    document.getElementById("register-form-container").style.display = "block";
  });

  showLoginLink.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("register-form-container").style.display = "none";
    document.getElementById("login-form-container").style.display = "block";
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      name: document.getElementById("register-name").value,
      email: document.getElementById("register-email").value,
      password: document.getElementById("register-password").value,
      companyName: document.getElementById("register-company").value,
      countryCode: document.getElementById("register-country").value,
    };
    const result = await fetchAPI("/auth/register", "POST", body);
    if (result) {
      showNotification("Registration successful! Please login.", "success");
      showLoginLink.click();
      registerForm.reset();
    }
  });
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const loginButton = loginForm.querySelector("button"); // Get the button

    const body = {
      email: document.getElementById("login-email").value,
      password: document.getElementById("login-password").value,
    };

    document
      .getElementById("admin-dashboard")
      .addEventListener("click", async (e) => {
        if (e.target.classList.contains("set-special-btn")) {
          const userId = e.target.dataset.id;
          const result = await fetchAPI(
            `/admin/users/${userId}/set-special`,
            "PUT"
          );
          if (result) {
            showNotification(result.message, "success");
            loadUserManagement(); // Refresh the list
          }
        }
      });

    // --- NEW: Add loading state ---
    loginButton.disabled = true;
    loginButton.textContent = "Logging In...";

    try {
      const data = await fetchAPI("/auth/login", "POST", body);
      if (data && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        initializeDashboard();
      }
    } finally {
      // --- NEW: Reset button state after API call is finished ---
      loginButton.disabled = false;
      loginButton.textContent = "Login";
    }
  });

  logoutBtn.addEventListener("click", logout);
  // --- OCR Logic ---
  const receiptUploadInput = document.getElementById("receipt-upload");

  receiptUploadInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    alert("Reading receipt... This may take a moment.");

    // Use Tesseract to recognize text in the image
    const {
      data: { text },
    } = await Tesseract.recognize(file, "eng");

    // --- Simple Logic to find the total amount (you can make this smarter) ---
    // This looks for lines containing "Total" and then finds a number.
    const lines = text.split("\n");
    let totalAmount = "";
    const totalKeywords = [
      "total",
      "amount",
      "subtotal",
      "balance",
      "pay",
      "due",
      "grand total",
    ];

    let possibleTotals = [];
    const moneyRegex = /[$€£]?\s*(\d+(\.\d{1,2})?)/; // More flexible regex

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (totalKeywords.some((keyword) => lowerLine.includes(keyword))) {
        const match = line.match(moneyRegex);
        if (match) {
          possibleTotals.push(parseFloat(match[1])); // Add the found number to a list
        }
      }
    }

    if (possibleTotals.length > 0) {
      // Find the largest number from the list, assuming it's the grand total
      const finalAmount = Math.max(...possibleTotals);
      document.getElementById("expense-amount").value = finalAmount.toFixed(2);
    } else {
      alert("Could not automatically find the total amount.");
    }
  });
  // End of OCR Logic ---
  expenseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitButton = expenseForm.querySelector("button"); // Get the button

    const body = {
      amount: parseFloat(document.getElementById("expense-amount").value),
      currency: document.getElementById("expense-currency").value.toUpperCase(),
      category: document.getElementById("expense-category").value,
      description: document.getElementById("expense-description").value,
    };

    // --- NEW: Add loading state ---
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
      const result = await fetchAPI("/expenses", "POST", body);
      if (result) {
        showNotification("Expense submitted successfully!", "success");
        expenseForm.reset();
        loadEmployeeExpenses();
      }
    } finally {
      // --- NEW: Reset button state ---
      submitButton.disabled = false;
      submitButton.textContent = "Submit Expense";
    }
  });

  document
    .getElementById("pending-approvals-table")
    .addEventListener("click", async (e) => {
      const expenseId = e.target.dataset.id;
      if (!expenseId) return;

      const isApprove = e.target.classList.contains("approve-btn");
      const isReject = e.target.classList.contains("reject-btn");

      if (isApprove || isReject) {
        const modal = document.getElementById("comment-modal");
        const submitBtn = document.getElementById("modal-submit-btn");
        const cancelBtn = document.getElementById("modal-cancel-btn");
        const textarea = document.getElementById("comment-textarea");

        // Show the modal
        textarea.value = ""; // Clear previous comments
        modal.style.display = "flex";

        const handleSubmit = async () => {
          const comments = textarea.value;
          const action = isApprove ? "approve" : "reject";

          // Hide the modal
          modal.style.display = "none";

          const result = await fetchAPI(
            `/expenses/${expenseId}/${action}`,
            "PUT",
            { comments }
          );
          if (result) {
            showNotification(result.message, "success");
            loadPendingApprovals(); // Refresh the list
          }

          // Clean up event listeners
          submitBtn.removeEventListener("click", handleSubmit);
          cancelBtn.removeEventListener("click", handleCancel);
        };

        const handleCancel = () => {
          modal.style.display = "none";
          // Clean up event listeners
          submitBtn.removeEventListener("click", handleSubmit);
          cancelBtn.removeEventListener("click", handleCancel);
        };

        submitBtn.addEventListener("click", handleSubmit, { once: true });
        cancelBtn.addEventListener("click", handleCancel, { once: true });
      }
    });
  // --- Initial Check ---
  if (token) {
    initializeDashboard();
  } else {
    navigateTo("auth-view");
  }
});
