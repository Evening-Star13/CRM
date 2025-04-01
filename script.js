class CRM {
  constructor() {
    this.data = {
      customers: [],
      vendors: [],
      products: [],
      tasks: [],
      analyticsNotes: [],
      history: {
        customers: {},
        vendors: {},
        products: {},
        tasks: {},
        analytics: [],
      },
      relationships: { customerPurchases: {}, vendorSupplies: {} },
      users: { admin: "password123" },
      loggedInUsers: new Set(), // Track logged-in users
    };
    this.isAuthenticated = false;
    this.currentUser = null;
    this.init();
  }

  init() {
    this.loadData(); // Load data first to ensure users are available
    this.setupAuthentication();
    this.setupEventListeners();
  }

  setupAuthentication() {
    const loginForm = document.getElementById("loginForm");
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;
      if (this.data.users[username] === password) {
        this.isAuthenticated = true;
        this.currentUser = username;
        this.data.loggedInUsers.add(username);
        this.saveData();
        document.getElementById("loginContainer").style.display = "none";
        document.getElementById("mainContainer").style.display = "flex";
        this.renderAll();
      } else {
        alert("Invalid credentials");
      }
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
      this.isAuthenticated = false;
      this.data.loggedInUsers.delete(this.currentUser);
      this.currentUser = null;
      this.saveData();
      document.getElementById("mainContainer").style.display = "none";
      document.getElementById("loginContainer").style.display = "flex";
      loginForm.reset();
    });

    document.getElementById("newUserBtn").addEventListener("click", () => {
      const username = prompt("Enter new username:");
      if (!username || this.data.users[username]) {
        alert("Username already exists or is invalid.");
        return;
      }
      const password = prompt("Enter password:");
      if (!password) {
        alert("Password cannot be empty.");
        return;
      }
      this.data.users[username] = password;
      this.saveData(); // Save immediately to persist the new user
      alert("New user created successfully!");
    });
  }

  setupEventListeners() {
    document.querySelector(".sidebar nav").addEventListener("click", (e) => {
      const li = e.target.closest("li");
      if (li) {
        document.querySelector(".sidebar li.active").classList.remove("active");
        li.classList.add("active");
        document
          .querySelector(".content-section.active")
          .classList.remove("active");
        document.getElementById(li.dataset.section).classList.add("active");
      }
    });

    document.addEventListener("click", (e) => {
      const action = e.target.dataset.action;
      const type = e.target.dataset.type;
      const id = e.target.dataset.id;
      const recall = e.target.closest(".card")?.dataset.recall;
      const deleteNoteId = e.target.dataset.deleteNoteId;
      const deleteUser = e.target.dataset.deleteUser;

      if (action === "add" && type) this.showForm(type);
      if (action === "edit" && id && type)
        this.showForm(type, this.getItem(type, Number(id)));
      if (action === "delete" && id && type) this.deleteItem(type, Number(id));
      if (action === "recall" && id && type) this.showRecall(type, Number(id));
      if (recall) this.showAnalyticsCardRecall(recall);
      if (deleteNoteId) this.deleteAnalyticsNote(Number(deleteNoteId));
      if (deleteUser) this.deleteUser(deleteUser);
    });

    ["customerSearch", "vendorSearch", "productSearch"].forEach((id) => {
      document.getElementById(id).addEventListener("input", (e) => {
        this[`render${id.replace("Search", "s")}`](e.target.value);
      });
    });

    document
      .getElementById("recallAnalyticsBtn")
      .addEventListener("click", () => this.showAnalyticsRecall());
    document
      .getElementById("exportBtn")
      .addEventListener("click", () => this.exportData());
    document
      .getElementById("importBtn")
      .addEventListener("click", () =>
        document.getElementById("importFile").click()
      );
    document
      .getElementById("importFile")
      .addEventListener("change", (e) => this.importData(e));
    document
      .getElementById("saveAnalyticsNote")
      .addEventListener("click", () => this.saveAnalyticsNote());
    document
      .getElementById("notesDateFilter")
      .addEventListener("change", (e) =>
        this.renderAnalyticsNotes(e.target.value)
      );
    document
      .getElementById("usersBtn")
      .addEventListener("click", () => this.showUsersModal());
    document
      .getElementById("toggleNotesBtn")
      .addEventListener("click", () => this.toggleNotesList());

    document.querySelectorAll(".modal .close").forEach((close) => {
      close.addEventListener("click", () => {
        document.getElementById("modal").style.display = "none";
        document.getElementById("recallModal").style.display = "none";
        document.getElementById("usersModal").style.display = "none";
      });
    });

    window.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) e.target.style.display = "none";
    });
  }

  showUsersModal() {
    if (!this.isAuthenticated) return;
    const modal = document.getElementById("usersModal");
    const usersList = document.getElementById("usersList");
    usersList.innerHTML = Object.keys(this.data.users)
      .map(
        (username) => `
          <div class="users-list-item">
              <span>${username}</span>
              <div class="status">
                  <input type="radio" id="loggedOut_${username}" name="status_${username}" value="loggedOut" ${
          !this.data.loggedInUsers.has(username) ? "checked" : ""
        }>
                  <label for="loggedOut_${username}"></label>
                  <input type="radio" id="loggedIn_${username}" name="status_${username}" value="loggedIn" ${
          this.data.loggedInUsers.has(username) ? "checked" : ""
        }>
                  <label for="loggedIn_${username}"></label>
              </div>
              <button class="btn delete" data-delete-user="${username}">Delete</button>
          </div>
      `
      )
      .join("");
    modal.style.display = "block";
  }

  deleteUser(username) {
    if (username === this.currentUser) {
      alert("You cannot delete your own account while logged in.");
      return;
    }
    if (confirm(`Are you sure you want to delete the user "${username}"?`)) {
      delete this.data.users[username];
      this.data.loggedInUsers.delete(username);
      this.saveData();
      this.showUsersModal(); // Refresh the modal
    }
  }

  toggleNotesList() {
    const notesList = document.getElementById("notesList");
    notesList.classList.toggle("collapsed");
  }

  showForm(type, item = {}) {
    if (!this.isAuthenticated) return;
    const modal = document.getElementById("modal");
    const title = document.getElementById("modalTitle");
    const fields = document.getElementById("formFields");

    title.textContent = item.id ? `Edit ${type}` : `Add ${type}`;
    fields.innerHTML = {
      customer: `
              <input type="hidden" name="id" value="${item.id || ""}">
              <input type="text" name="name" value="${
                item.name || ""
              }" placeholder="Name" required>
              <input type="email" name="email" value="${
                item.email || ""
              }" placeholder="Email" required>
              <input type="tel" name="phone" value="${
                item.phone || ""
              }" placeholder="Phone" required>
              <select name="status" required>
                  <option value="Active" ${
                    item.status === "Active" ? "selected" : ""
                  }>Active</option>
                  <option value="Inactive" ${
                    item.status === "Inactive" ? "selected" : ""
                  }>Inactive</option>
              </select>
              <h3>Add Purchase</h3>
              <select name="productId" class="product-select">
                  <option value="">Select Product</option>
                  ${this.data.products
                    .map((p) => `<option value="${p.id}">${p.name}</option>`)
                    .join("")}
              </select>
              <select name="vendorId" class="vendor-select">
                  <option value="">Select Vendor</option>
              </select>
              <input type="number" name="purchasePrice" placeholder="Purchase Price" step="0.01">
              <input type="number" name="quantity" placeholder="Quantity" min="1">
              <textarea name="notes" placeholder="Notes">${
                item.notes || ""
              }</textarea>
          `,
      vendor: `
              <input type="hidden" name="id" value="${item.id || ""}">
              <input type="text" name="name" value="${
                item.name || ""
              }" placeholder="Name" required>
              <input type="text" name="contact" value="${
                item.contact || ""
              }" placeholder="Contact Person" required>
              <input type="email" name="email" value="${
                item.email || ""
              }" placeholder="Email" required>
              <select name="status" required>
                  <option value="Active" ${
                    item.status === "Active" ? "selected" : ""
                  }>Active</option>
                  <option value="Inactive" ${
                    item.status === "Inactive" ? "selected" : ""
                  }>Inactive</option>
              </select>
              <h3>Add Product Supply</h3>
              <select name="productId" class="product-select">
                  <option value="">Select Product</option>
                  ${this.data.products
                    .map((p) => `<option value="${p.id}">${p.name}</option>`)
                    .join("")}
                  <option value="new">Add New Product</option>
              </select>
              <div class="new-product-fields" style="display: none;">
                  <input type="text" name="newProductName" placeholder="New Product Name">
                  <input type="number" name="newProductPrice" placeholder="Price" step="0.01">
                  <input type="number" name="newProductStock" placeholder="Stock">
                  <textarea name="newProductNotes" placeholder="Product Notes"></textarea>
              </div>
              <input type="number" name="waitTime" placeholder="Wait Time (days)" min="0">
              <input type="number" name="deliveryTime" placeholder="Delivery Time (days)" min="0">
              <textarea name="notes" placeholder="Notes">${
                item.notes || ""
              }</textarea>
          `,
      product: `
              <input type="hidden" name="id" value="${item.id || ""}">
              <input type="text" name="name" value="${
                item.name || ""
              }" placeholder="Name" required>
              <input type="number" name="price" value="${
                item.price || ""
              }" placeholder="Price" step="0.01" required>
              <input type="number" name="stock" value="${
                item.stock || ""
              }" placeholder="Stock" required>
              <textarea name="notes" placeholder="Notes">${
                item.notes || ""
              }</textarea>
          `,
      task: `
              <input type="hidden" name="id" value="${item.id || ""}">
              <input type="text" name="title" value="${
                item.title || ""
              }" placeholder="Title" required>
              <select name="customer" required>
                  <option value="">Select Customer</option>
                  ${this.data.customers
                    .map(
                      (c) =>
                        `<option value="${c.id}" ${
                          item.customer === c.id ? "selected" : ""
                        }>${c.name}</option>`
                    )
                    .join("")}
              </select>
              <input type="date" name="dueDate" value="${
                item.dueDate || ""
              }" required>
              <select name="priority" required>
                  <option value="Low" ${
                    item.priority === "Low" ? "selected" : ""
                  }>Low</option>
                  <option value="Medium" ${
                    item.priority === "Medium" ? "selected" : ""
                  }>Medium</option>
                  <option value="High" ${
                    item.priority === "High" ? "selected" : ""
                  }>High</option>
              </select>
              <select name="status" required>
                  <option value="Pending" ${
                    item.status === "Pending" ? "selected" : ""
                  }>Pending</option>
                  <option value="Completed" ${
                    item.status === "Completed" ? "selected" : ""
                  }>Completed</option>
              </select>
              <textarea name="notes" placeholder="Notes">${
                item.notes || ""
              }</textarea>
          `,
    }[type];

    const form = document.getElementById("crudForm");
    form.onsubmit = (e) => {
      e.preventDefault();
      const formData = Object.fromEntries(new FormData(e.target));
      this.saveItem(type, formData);
      modal.style.display = "none";
      this.renderAll();
    };

    const productSelect = fields.querySelector(".product-select");
    const vendorSelect = fields.querySelector(".vendor-select");
    const priceInput =
      fields.querySelector('[name="purchasePrice"]') ||
      fields.querySelector('[name="newProductPrice"]');

    if (productSelect && priceInput) {
      productSelect.addEventListener("change", () => {
        const productId = productSelect.value;
        if (productId && productId !== "new") {
          const product = this.getItem("product", Number(productId));
          priceInput.value = product.price || "";
          if (vendorSelect) {
            const supplyingVendors = this.getProductVendors(Number(productId));
            vendorSelect.innerHTML =
              '<option value="">Select Vendor</option>' +
              supplyingVendors
                .map(
                  (v) =>
                    `<option value="${v.vendorId}">${
                      this.getItem("vendor", v.vendorId).name
                    }</option>`
                )
                .join("");
          }
        } else {
          priceInput.value = "";
          if (vendorSelect)
            vendorSelect.innerHTML = '<option value="">Select Vendor</option>';
        }
      });
    }

    if (type === "vendor") {
      const newProductFields = fields.querySelector(".new-product-fields");
      productSelect.addEventListener("change", () => {
        newProductFields.style.display =
          productSelect.value === "new" ? "block" : "none";
      });
    }

    modal.style.display = "block";
  }

  saveItem(type, formData) {
    const item = {
      ...formData,
      id: formData.id ? Number(formData.id) : Date.now(),
    };
    if (type === "task") {
      item.customer = Number(item.customer);
    }
    const collection = this.data[`${type}s`];
    const index = collection.findIndex((i) => i.id === item.id);

    if (index === -1) {
      collection.push(item);
      this.data.history[`${type}s`][item.id] = [];
    } else {
      const oldItem = collection[index];
      const changes = this.getChanges(oldItem, item);
      if (Object.keys(changes).length) {
        this.data.history[`${type}s`][item.id].push({
          timestamp: new Date().toISOString(),
          changes,
        });
      }
      collection[index] = item;
    }

    if (
      type === "customer" &&
      item.productId &&
      item.vendorId &&
      item.purchasePrice &&
      item.quantity
    ) {
      this.addCustomerPurchase(
        item.id,
        item.productId,
        item.vendorId,
        item.purchasePrice,
        item.quantity
      );
    }
    if (type === "vendor") {
      if (
        item.productId === "new" &&
        item.newProductName &&
        item.newProductPrice &&
        item.newProductStock
      ) {
        const newProduct = {
          id: Date.now(),
          name: item.newProductName,
          price: Number(item.newProductPrice),
          stock: Number(item.newProductStock),
          notes: item.newProductNotes || "",
        };
        this.data.products.push(newProduct);
        this.data.history.products[newProduct.id] = [];
        item.productId = newProduct.id;
      }
      if (item.productId && item.waitTime && item.deliveryTime) {
        this.addVendorSupply(
          item.id,
          item.productId,
          item.waitTime,
          item.deliveryTime
        );
      }
    }

    this.saveData();
  }

  getItem(type, id) {
    return this.data[`${type}s`].find((i) => i.id === id) || {};
  }

  deleteItem(type, id) {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
      this.data[`${type}s`] = this.data[`${type}s`].filter((i) => i.id !== id);
      delete this.data.history[`${type}s`][id];
      if (type === "customer")
        delete this.data.relationships.customerPurchases[id];
      if (type === "vendor") delete this.data.relationships.vendorSupplies[id];
      this.saveData();
      this.renderAll();
    }
  }

  saveAnalyticsNote() {
    const noteText = document.getElementById("analyticsNotes").value.trim();
    const dateFilter =
      document.getElementById("notesDateFilter").value ||
      new Date().toISOString().split("T")[0];
    if (!noteText) {
      alert("Please enter a note before saving.");
      return;
    }
    const note = {
      id: Date.now(),
      text: noteText,
      timestamp: `${dateFilter}T${new Date().toISOString().split("T")[1]}`,
    };
    this.data.analyticsNotes.push(note);
    document.getElementById("analyticsNotes").value = "";
    document.getElementById("notesDateFilter").value = dateFilter;
    this.saveData();
    this.renderAnalyticsNotes(dateFilter);
    alert("Note saved successfully!");
  }

  deleteAnalyticsNote(noteId) {
    if (confirm("Are you sure you want to delete this note?")) {
      this.data.analyticsNotes = this.data.analyticsNotes.filter(
        (n) => n.id !== noteId
      );
      this.saveData();
      this.showAnalyticsRecall();
      this.renderAnalyticsNotes(
        document.getElementById("notesDateFilter").value
      );
    }
  }

  showRecall(type, id) {
    const modal = document.getElementById("recallModal");
    const title = document.getElementById("recallTitle");
    const content = document.getElementById("recallContent");
    const item = this.getItem(type, id);
    const history = this.data.history[`${type}s`][id] || [];

    const templates = {
      customer: () => `
              <h3>Current Details</h3>
              <p>Name: ${item.name}</p>
              <p>Email: ${item.email}</p>
              <p>Phone: ${item.phone}</p>
              <p>Status: ${item.status}</p>
              <p>Notes: ${item.notes || "None"}</p>
              <h3>Purchase History</h3>
              ${
                this.getCustomerPurchases(id)
                  .map(
                    (p) => `
                  <div class="relationship-item">
                      <p>Product: ${
                        this.getItem("product", p.productId).name || "Unknown"
                      }</p>
                      <p>Vendor: ${
                        this.getItem("vendor", p.vendorId).name || "Unknown"
                      }</p>
                      <p>Price: $${Number(p.price).toFixed(2)}</p>
                      <p>Quantity: ${p.quantity}</p>
                      <p>Date: ${p.date}</p>
                  </div>
              `
                  )
                  .join("") || "No purchases"
              }
          `,
      vendor: () => `
              <h3>Current Details</h3>
              <p>Name: ${item.name}</p>
              <p>Contact: ${item.contact}</p>
              <p>Email: ${item.email}</p>
              <p>Status: ${item.status}</p>
              <p>Notes: ${item.notes || "None"}</p>
              <h3>Supplied Products</h3>
              ${
                this.getVendorSupplies(id)
                  .map(
                    (s) => `
                  <div class="relationship-item">
                      <p>Product: ${
                        this.getItem("product", s.productId).name || "Unknown"
                      }</p>
                      <p>Wait Time: ${s.waitTime} days</p>
                      <p>Delivery Time: ${s.deliveryTime} days</p>
                  </div>
              `
                  )
                  .join("") || "No products supplied"
              }
          `,
      product: () => `
              <h3>Current Details</h3>
              <p>Name: ${item.name}</p>
              <p>Price: $${Number(item.price).toFixed(2)}</p>
              <p>Stock: ${item.stock}</p>
              <p>Notes: ${item.notes || "None"}</p>
              <h3>Supplied By Vendors</h3>
              ${
                this.getProductVendors(id)
                  .map(
                    (v) => `
                  <div class="relationship-item">
                      <p>Vendor: ${
                        this.getItem("vendor", v.vendorId).name || "Unknown"
                      }</p>
                      <p>Wait Time: ${v.waitTime} days</p>
                      <p>Delivery Time: ${v.deliveryTime} days</p>
                  </div>
              `
                  )
                  .join("") || "No vendors"
              }
              <h3>Purchased By Customers</h3>
              ${
                this.getProductCustomers(id)
                  .map(
                    (c) => `
                  <div class="relationship-item">
                      <p>Customer: ${
                        this.getItem("customer", c.customerId).name || "Unknown"
                      }</p>
                      <p>Price: $${Number(c.price).toFixed(2)}</p>
                      <p>Quantity: ${c.quantity}</p>
                      <p>Date: ${c.date}</p>
                  </div>
              `
                  )
                  .join("") || "No purchases"
              }
          `,
      task: () => `
              <h3>Current Details</h3>
              <p>Title: ${item.title}</p>
              <p>Customer: ${
                this.getItem("customer", Number(item.customer)).name ||
                "Unknown"
              }</p>
              <p>Due Date: ${item.dueDate}</p>
              <p>Priority: ${item.priority}</p>
              <p>Status: ${item.status}</p>
              <p>Notes: ${item.notes || "None"}</p>
          `,
    };

    title.textContent = `${
      type.charAt(0).toUpperCase() + type.slice(1)
    } History: ${item.name || item.title}`;
    content.innerHTML =
      templates[type]() +
      `
          <h3>Change History</h3>
          ${
            history
              .map(
                (h) => `
              <div class="history-item">
                  <p>Timestamp: ${h.timestamp}</p>
                  <p>Changes: ${JSON.stringify(h.changes)}</p>
              </div>
          `
              )
              .join("") || "No history available"
          }
      `;
    modal.style.display = "block";
  }

  showAnalyticsRecall() {
    const modal = document.getElementById("recallModal");
    const title = document.getElementById("recallTitle");
    const content = document.getElementById("recallContent");
    const currentDateFilter = document.getElementById("notesDateFilter").value;

    title.textContent = "Analytics History";
    content.innerHTML = `
          <h3>Current Analytics</h3>
          <p>Total Customers: ${this.data.customers.length}</p>
          <p>Active Customers: ${
            this.data.customers.filter((c) => c.status === "Active").length
          }</p>
          <p>Inactive Customers: ${
            this.data.customers.filter((c) => c.status === "Inactive").length
          }</p>
          <p>Total Vendors: ${this.data.vendors.length}</p>
          <p>Total Products: ${this.data.products.length}</p>
          <p>Low Stock Products: ${
            this.data.products.filter((p) => p.stock < 10).length
          }</p>
          <p>High Priority Tasks: ${
            this.data.tasks.filter(
              (t) => t.priority === "High" && t.status === "Pending"
            ).length
          }</p>
          <h3>Notes History</h3>
          ${
            this.data.analyticsNotes
              .map(
                (n) => `
              <div class="history-item">
                  <p>Timestamp: ${n.timestamp}</p>
                  <p>Note: ${n.text}</p>
                  <span class="delete-note" data-delete-note-id="${n.id}">🗑️</span>
              </div>
          `
              )
              .join("") || "No notes available"
          }
      `;
    modal.style.display = "block";
    document.getElementById("notesDateFilter").value = currentDateFilter;
  }

  showAnalyticsCardRecall(type) {
    const modal = document.getElementById("recallModal");
    const title = document.getElementById("recallTitle");
    const content = document.getElementById("recallContent");

    const templates = {
      totalCustomers: () => `
              <h3>Total Customers (${this.data.customers.length})</h3>
              ${
                this.data.customers
                  .map(
                    (c) => `
                  <div class="relationship-item">
                      <p>Name: ${c.name}</p>
                      <p>Email: ${c.email}</p>
                      <p>Status: ${c.status}</p>
                      <p>Notes: ${c.notes || "None"}</p>
                  </div>
              `
                  )
                  .join("") || "No customers"
              }
          `,
      activeCustomers: () => `
              <h3>Active Customers (${
                this.data.customers.filter((c) => c.status === "Active").length
              })</h3>
              ${
                this.data.customers
                  .filter((c) => c.status === "Active")
                  .map(
                    (c) => `
                  <div class="relationship-item">
                      <p>Name: ${c.name}</p>
                      <p>Email: ${c.email}</p>
                      <p>Notes: ${c.notes || "None"}</p>
                  </div>
              `
                  )
                  .join("") || "No active customers"
              }
          `,
      inactiveCustomers: () => `
              <h3>Inactive Customers (${
                this.data.customers.filter((c) => c.status === "Inactive")
                  .length
              })</h3>
              ${
                this.data.customers
                  .filter((c) => c.status === "Inactive")
                  .map(
                    (c) => `
                  <div class="relationship-item">
                      <p>Name: ${c.name}</p>
                      <p>Email: ${c.email}</p>
                      <p>Notes: ${c.notes || "None"}</p>
                  </div>
              `
                  )
                  .join("") || "No inactive customers"
              }
          `,
      totalVendors: () => `
              <h3>Total Vendors (${this.data.vendors.length})</h3>
              ${
                this.data.vendors
                  .map(
                    (v) => `
                  <div class="relationship-item">
                      <p>Name: ${v.name}</p>
                      <p>Contact: ${v.contact}</p>
                      <p>Email: ${v.email}</p>
                      <p>Status: ${v.status}</p>
                      <p>Notes: ${v.notes || "None"}</p>
                  </div>
              `
                  )
                  .join("") || "No vendors"
              }
          `,
      totalProducts: () => `
              <h3>Total Products (${this.data.products.length})</h3>
              ${
                this.data.products
                  .map(
                    (p) => `
                  <div class="relationship-item">
                      <p>Name: ${p.name}</p>
                      <p>Price: $${Number(p.price).toFixed(2)}</p>
                      <p>Stock: ${p.stock}</p>
                      <p>Notes: ${p.notes || "None"}</p>
                  </div>
              `
                  )
                  .join("") || "No products"
              }
          `,
      lowStock: () => `
              <h3>Low Stock Products (${
                this.data.products.filter((p) => p.stock < 10).length
              })</h3>
              ${
                this.data.products
                  .filter((p) => p.stock < 10)
                  .map(
                    (p) => `
                  <div class="relationship-item">
                      <p>Name: ${p.name}</p>
                      <p>Price: $${Number(p.price).toFixed(2)}</p>
                      <p>Stock: ${p.stock}</p>
                      <p>Notes: ${p.notes || "None"}</p>
                  </div>
              `
                  )
                  .join("") || "No low stock products"
              }
          `,
      highPriorityTasks: () => `
              <h3>High Priority Tasks (${
                this.data.tasks.filter(
                  (t) => t.priority === "High" && t.status === "Pending"
                ).length
              })</h3>
              ${
                this.data.tasks
                  .filter(
                    (t) => t.priority === "High" && t.status === "Pending"
                  )
                  .map(
                    (t) => `
                  <div class="relationship-item">
                      <p>Title: ${t.title}</p>
                      <p>Customer: ${
                        this.getItem("customer", Number(t.customer)).name ||
                        "Unknown"
                      }</p>
                      <p>Due Date: ${t.dueDate}</p>
                      <p>Notes: ${t.notes || "None"}</p>
                  </div>
              `
                  )
                  .join("") || "No high priority tasks"
              }
          `,
    };

    title.textContent = templates[type]().match(/<h3>(.*?)<\/h3>/)[1];
    content.innerHTML = templates[type]();
    modal.style.display = "block";
  }

  addCustomerPurchase(customerId, productId, vendorId, price, quantity) {
    this.data.relationships.customerPurchases[customerId] =
      this.data.relationships.customerPurchases[customerId] || [];
    this.data.relationships.customerPurchases[customerId].push({
      productId: Number(productId),
      vendorId: Number(vendorId),
      price: Number(price),
      quantity: Number(quantity),
      date: new Date().toISOString(),
    });
    this.saveData();
  }

  addVendorSupply(vendorId, productId, waitTime, deliveryTime) {
    this.data.relationships.vendorSupplies[vendorId] =
      this.data.relationships.vendorSupplies[vendorId] || [];
    this.data.relationships.vendorSupplies[vendorId].push({
      productId: Number(productId),
      waitTime: Number(waitTime),
      deliveryTime: Number(deliveryTime),
    });
    this.saveData();
  }

  getCustomerPurchases(customerId) {
    return this.data.relationships.customerPurchases[customerId] || [];
  }

  getVendorSupplies(vendorId) {
    return this.data.relationships.vendorSupplies[vendorId] || [];
  }

  getProductVendors(productId) {
    return Object.entries(this.data.relationships.vendorSupplies).flatMap(
      ([vendorId, supplies]) =>
        supplies
          .filter((s) => s.productId === Number(productId))
          .map((s) => ({ ...s, vendorId: Number(vendorId) }))
    );
  }

  getProductCustomers(productId) {
    return Object.entries(this.data.relationships.customerPurchases).flatMap(
      ([customerId, purchases]) =>
        purchases
          .filter((p) => p.productId === Number(productId))
          .map((p) => ({ ...p, customerId: Number(customerId) }))
    );
  }

  getChanges(oldItem, newItem) {
    const changes = {};
    for (const key in newItem) {
      if (key !== "id" && oldItem[key] !== newItem[key]) {
        changes[key] = { from: oldItem[key], to: newItem[key] };
      }
    }
    return changes;
  }

  renderCustomers(search = "") {
    const tbody = document.getElementById("customerTable");
    const filtered = this.data.customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
    );
    tbody.innerHTML = filtered
      .map(
        (c) => `
          <tr>
              <td>${c.name}</td>
              <td>${c.email}</td>
              <td>${c.phone}</td>
              <td>${c.status}</td>
              <td class="notes">${c.notes || ""}</td>
              <td>
                  <button class="btn" data-action="edit" data-type="customer" data-id="${
                    c.id
                  }">Edit</button>
                  <button class="btn" data-action="delete" data-type="customer" data-id="${
                    c.id
                  }">Delete</button>
                  <button class="btn" data-action="recall" data-type="customer" data-id="${
                    c.id
                  }">Recall</button>
              </td>
          </tr>
      `
      )
      .join("");
  }

  renderVendors(search = "") {
    const tbody = document.getElementById("vendorTable");
    const filtered = this.data.vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.email.toLowerCase().includes(search.toLowerCase())
    );
    tbody.innerHTML = filtered
      .map(
        (v) => `
          <tr>
              <td>${v.name}</td>
              <td>${v.contact}</td>
              <td>${v.email}</td>
              <td>${v.status}</td>
              <td class="notes">${v.notes || ""}</td>
              <td>
                  <button class="btn" data-action="edit" data-type="vendor" data-id="${
                    v.id
                  }">Edit</button>
                  <button class="btn" data-action="delete" data-type="vendor" data-id="${
                    v.id
                  }">Delete</button>
                  <button class="btn" data-action="recall" data-type="vendor" data-id="${
                    v.id
                  }">Recall</button>
              </td>
          </tr>
      `
      )
      .join("");
  }

  renderProducts(search = "") {
    const tbody = document.getElementById("productTable");
    const filtered = this.data.products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
    tbody.innerHTML = filtered
      .map(
        (p) => `
          <tr>
              <td>${p.name}</td>
              <td>$${Number(p.price).toFixed(2)}</td>
              <td>${p.stock}</td>
              <td class="notes">${p.notes || ""}</td>
              <td>
                  <button class="btn" data-action="edit" data-type="product" data-id="${
                    p.id
                  }">Edit</button>
                  <button class="btn" data-action="delete" data-type="product" data-id="${
                    p.id
                  }">Delete</button>
                  <button class="btn" data-action="recall" data-type="product" data-id="${
                    p.id
                  }">Recall</button>
              </td>
          </tr>
      `
      )
      .join("");
  }

  renderTasks() {
    const tbody = document.getElementById("taskTable");
    tbody.innerHTML = this.data.tasks
      .map(
        (t) => `
          <tr>
              <td>${t.title}</td>
              <td>${
                this.getItem("customer", Number(t.customer)).name || "Unknown"
              }</td>
              <td>${t.dueDate}</td>
              <td>${t.priority}</td>
              <td>${t.status}</td>
              <td class="notes">${t.notes || ""}</td>
              <td>
                  <button class="btn" data-action="edit" data-type="task" data-id="${
                    t.id
                  }">Edit</button>
                  <button class="btn" data-action="delete" data-type="task" data-id="${
                    t.id
                  }">Delete</button>
                  <button class="btn" data-action="recall" data-type="task" data-id="${
                    t.id
                  }">Recall</button>
              </td>
          </tr>
      `
      )
      .join("");
  }

  renderAnalytics() {
    document.getElementById("totalCustomers").textContent =
      this.data.customers.length || 0;
    document.getElementById("activeCustomers").textContent =
      this.data.customers.filter((c) => c.status === "Active").length || 0;
    document.getElementById("inactiveCustomers").textContent =
      this.data.customers.filter((c) => c.status === "Inactive").length || 0;
    document.getElementById("totalVendors").textContent =
      this.data.vendors.length || 0;
    document.getElementById("totalProducts").textContent =
      this.data.products.length || 0;
    document.getElementById("lowStock").textContent =
      this.data.products.filter((p) => p.stock < 10).length || 0;
    document.getElementById("highPriorityTasks").textContent =
      this.data.tasks.filter(
        (t) => t.priority === "High" && t.status === "Pending"
      ).length || 0;
    this.renderAnalyticsNotes(document.getElementById("notesDateFilter").value);
  }

  renderAnalyticsNotes(dateFilter = "") {
    const notesList = document.getElementById("notesList");
    let filteredNotes = this.data.analyticsNotes;
    if (dateFilter) {
      filteredNotes = filteredNotes.filter((n) =>
        n.timestamp.startsWith(dateFilter)
      );
    }
    notesList.innerHTML =
      filteredNotes
        .map(
          (n) => `
          <div class="note-item">
              <p><strong>${n.timestamp}</strong></p>
              <p>${n.text}</p>
          </div>
      `
        )
        .join("") || "<p>No notes available</p>";
  }

  renderAll() {
    if (!this.isAuthenticated) return;
    this.renderCustomers();
    this.renderVendors();
    this.renderProducts();
    this.renderTasks();
    this.renderAnalytics();
  }

  saveData() {
    Object.entries(this.data).forEach(([key, value]) => {
      if (key === "loggedInUsers") {
        localStorage.setItem(`crm_${key}`, JSON.stringify([...value])); // Convert Set to array
      } else {
        localStorage.setItem(`crm_${key}`, JSON.stringify(value));
      }
    });
  }

  loadData() {
    this.data = {
      customers: JSON.parse(localStorage.getItem("crm_customers") || "[]"),
      vendors: JSON.parse(localStorage.getItem("crm_vendors") || "[]"),
      products: JSON.parse(localStorage.getItem("crm_products") || "[]"),
      tasks: JSON.parse(localStorage.getItem("crm_tasks") || "[]"),
      analyticsNotes: JSON.parse(
        localStorage.getItem("crm_analyticsNotes") || "[]"
      ),
      history: JSON.parse(
        localStorage.getItem("crm_history") ||
          '{"customers":{},"vendors":{},"products":{},"tasks":{},"analytics":[]}'
      ),
      relationships: JSON.parse(
        localStorage.getItem("crm_relationships") ||
          '{"customerPurchases":{},"vendorSupplies":{}}'
      ),
      users: JSON.parse(
        localStorage.getItem("crm_users") || '{"admin":"password123"}'
      ),
      loggedInUsers: new Set(
        JSON.parse(localStorage.getItem("crm_loggedInUsers") || "[]")
      ),
    };
  }

  exportData() {
    const exportData = {
      ...this.data,
      loggedInUsers: [...this.data.loggedInUsers],
    }; // Convert Set to array
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "crm_data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        this.data = {
          customers: importedData.customers || [],
          vendors: importedData.vendors || [],
          products: importedData.products || [],
          tasks: importedData.tasks || [],
          analyticsNotes: importedData.analyticsNotes || [],
          history: importedData.history || {
            customers: {},
            vendors: {},
            products: {},
            tasks: {},
            analytics: [],
          },
          relationships: importedData.relationships || {
            customerPurchases: {},
            vendorSupplies: {},
          },
          users: importedData.users || { admin: "password123" },
          loggedInUsers: new Set(importedData.loggedInUsers || []),
        };
        this.saveData();
        this.renderAll();
        alert("Data imported successfully");
      } catch (error) {
        alert("Error importing data: " + error.message);
      }
    };
    reader.readAsText(file);
  }
}

const crm = new CRM();
window.crm = crm;
