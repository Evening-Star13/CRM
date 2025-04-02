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
      loggedInUsers: new Set(),
    };
    this.isAuthenticated = false;
    this.currentUser = null;
    this.init();
  }

  init() {
    this.loadData();
    this.setupAuthentication();
    this.setupEventListeners();
    this.renderAll();
  }

  setupAuthentication() {
    const loginForm = document.getElementById("loginForm");
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value;
      if (!username || !password) {
        alert("Username and password are required.");
        return;
      }
      if (this.data.users[username] === password) {
        this.isAuthenticated = true;
        this.currentUser = username;
        this.data.loggedInUsers.add(username);
        this.saveData();
        document.getElementById("loginContainer").classList.remove("active");
        document.getElementById("mainContainer").classList.add("active");
        this.renderAll();
      } else {
        alert("Invalid credentials.");
      }
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
      this.isAuthenticated = false;
      this.data.loggedInUsers.delete(this.currentUser);
      this.currentUser = null;
      this.saveData();
      document.getElementById("mainContainer").classList.remove("active");
      document.getElementById("loginContainer").classList.add("active");
      loginForm.reset();
    });

    document.getElementById("newUserBtn").addEventListener("click", () => {
      const username = prompt("Enter new username:").trim();
      if (!username || this.data.users[username]) {
        alert("Username already exists or is invalid.");
        return;
      }
      const password = prompt("Enter password:").trim();
      if (!password) {
        alert("Password cannot be empty.");
        return;
      }
      this.data.users[username] = password;
      this.saveData();
      alert("New user created successfully!");
    });
  }

  setupEventListeners() {
    const sidebarNav = document.querySelector(".sidebar nav");
    sidebarNav.addEventListener("click", (e) => {
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
      const target = e.target;
      const action = target.dataset.action;
      const type = target.dataset.type;
      const id = target.dataset.id ? Number(target.dataset.id) : null;
      const recall = target.closest(".card")?.dataset.recall;
      const deleteNoteId = target.dataset.deleteNoteId
        ? Number(target.dataset.deleteNoteId)
        : null;
      const deleteUser = target.dataset.deleteUser;

      if (action === "add" && type) this.showForm(type);
      else if (action === "edit" && id && type)
        this.showForm(type, this.getItem(type, id));
      else if (action === "delete" && id && type) this.deleteItem(type, id);
      else if (action === "recall" && id && type) this.showRecall(type, id);
      else if (recall) this.showAnalyticsCardRecall(recall);
      else if (deleteNoteId) this.deleteAnalyticsNote(deleteNoteId);
      else if (deleteUser) this.deleteUser(deleteUser);
    });

    document.addEventListener("change", (e) => {
      const select = e.target;
      if (select.classList.contains("vendor-price-select")) {
        this.showVendorDetails(select);
      }
    });

    ["customerSearch", "vendorSearch", "productSearch"].forEach((id) => {
      document.getElementById(id).addEventListener("input", (e) => {
        this[`render${id.replace("Search", "s")}`](e.target.value.trim());
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
      close.addEventListener(
        "click",
        () => (close.parentElement.parentElement.style.display = "none")
      );
    });

    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) e.target.style.display = "none";
    });
  }

  showVendorDetails(select) {
    const productId = Number(select.dataset.productId);
    const vendorId = Number(select.value);
    if (!vendorId) return;

    const product = this.getItem("product", productId);
    const vendorSupply =
      product.vendors.find((v) => v.vendorId === vendorId) || {};
    const vendor = this.getItem("vendor", vendorId);

    const modal = document.getElementById("recallModal");
    const title = document.getElementById("recallTitle");
    const content = document.getElementById("recallContent");

    title.textContent = `Vendor Details for ${product.name}`;
    content.innerHTML = `
      <h3>Vendor: ${vendor.name}</h3>
      <p>Base Price: $${
        vendor.price ? Number(vendor.price).toFixed(2) : "Not set"
      }</p>
      <p>Vendor-Specific Price: $${
        vendorSupply.price ? Number(vendorSupply.price).toFixed(2) : "Not set"
      }</p>
      <p>Stock: ${vendorSupply.stock || 0}</p>
      <p>Wait Time: ${vendorSupply.waitTime || 0} days</p>
      <p>Delivery Time: ${vendorSupply.deliveryTime || 0} days</p>
      <p>Contact: ${vendor.contact}</p>
      <p>Email: ${vendor.email}</p>
      <p>Mailing Address: ${vendor.mailingAddress?.street || "Not provided"}, ${
      vendor.mailingAddress?.city || ""
    }, ${vendor.mailingAddress?.state || ""} ${
      vendor.mailingAddress?.postalCode || ""
    }</p>
      <p>Status: ${vendor.status}</p>
    `;
    modal.style.display = "flex";
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
              <span class="status-indicator ${
                this.data.loggedInUsers.has(username)
                  ? "logged-in"
                  : "logged-out"
              }">
                ${this.data.loggedInUsers.has(username) ? "🟢" : "🔴"}
              </span>
            </div>
            <button class="btn delete" data-delete-user="${username}" ${
          username === this.currentUser ? "disabled" : ""
        }>Delete</button>
          </div>
        `
      )
      .join("");
    modal.style.display = "flex";
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
      this.showUsersModal();
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
        }" placeholder="Name" required aria-label="Customer Name">
        <input type="email" name="email" value="${
          item.email || ""
        }" placeholder="Email" required aria-label="Customer Email">
        <input type="tel" name="phone" value="${
          item.phone || ""
        }" placeholder="Phone" required aria-label="Customer Phone">
        <select name="status" required aria-label="Customer Status">
          <option value="Active" ${
            item.status === "Active" ? "selected" : ""
          }>Active</option>
          <option value="Inactive" ${
            item.status === "Inactive" ? "selected" : ""
          }>Inactive</option>
        </select>
        <div class="address-group">
          <h4>Mailing Address</h4>
          <input type="text" name="mailingStreet" value="${
            item.mailingAddress?.street || ""
          }" placeholder="Street" aria-label="Mailing Street">
          <input type="text" name="mailingCity" value="${
            item.mailingAddress?.city || ""
          }" placeholder="City" aria-label="Mailing City">
          <input type="text" name="mailingState" value="${
            item.mailingAddress?.state || ""
          }" placeholder="State/Province" aria-label="Mailing State">
          <input type="text" name="mailingPostalCode" value="${
            item.mailingAddress?.postalCode || ""
          }" placeholder="Postal/Zip Code" aria-label="Mailing Postal Code">
        </div>
        <div class="address-group">
          <h4>Delivery Address</h4>
          <input type="text" name="deliveryStreet" value="${
            item.deliveryAddress?.street || ""
          }" placeholder="Street" aria-label="Delivery Street">
          <input type="text" name="deliveryCity" value="${
            item.deliveryAddress?.city || ""
          }" placeholder="City" aria-label="Delivery City">
          <input type="text" name="deliveryState" value="${
            item.deliveryAddress?.state || ""
          }" placeholder="State/Province" aria-label="Delivery State">
          <input type="text" name="deliveryPostalCode" value="${
            item.deliveryAddress?.postalCode || ""
          }" placeholder="Postal/Zip Code" aria-label="Delivery Postal Code">
        </div>
        <div class="address-group">
          <h4>Billing Address</h4>
          <input type="text" name="billingStreet" value="${
            item.billingAddress?.street || ""
          }" placeholder="Street" aria-label="Billing Street">
          <input type="text" name="billingCity" value="${
            item.billingAddress?.city || ""
          }" placeholder="City" aria-label="Billing City">
          <input type="text" name="billingState" value="${
            item.billingAddress?.state || ""
          }" placeholder="State/Province" aria-label="Billing State">
          <input type="text" name="billingPostalCode" value="${
            item.billingAddress?.postalCode || ""
          }" placeholder="Postal/Zip Code" aria-label="Billing Postal Code">
        </div>
        <h3>Add Purchase</h3>
        <select name="productId" class="product-select" aria-label="Select Product">
          <option value="">Select Product</option>
          ${this.data.products
            .map((p) => `<option value="${p.id}">${p.name}</option>`)
            .join("")}
        </select>
        <select name="vendorId" class="vendor-select" aria-label="Select Vendor">
          <option value="">Select Vendor</option>
        </select>
        <input type="number" name="purchasePrice" value="${
          item.purchasePrice || ""
        }" placeholder="Purchase Price" step="0.01" min="0" aria-label="Purchase Price">
        <input type="number" name="quantity" value="${
          item.quantity || ""
        }" placeholder="Quantity" min="1" aria-label="Quantity">
        <textarea name="notes" placeholder="Notes" aria-label="Customer Notes">${
          item.notes || ""
        }</textarea>
      `,
      vendor: `
        <input type="hidden" name="id" value="${item.id || ""}">
        <input type="text" name="name" value="${
          item.name || ""
        }" placeholder="Name" required aria-label="Vendor Name">
        <input type="text" name="contact" value="${
          item.contact || ""
        }" placeholder="Contact Person" required aria-label="Vendor Contact">
        <input type="email" name="email" value="${
          item.email || ""
        }" placeholder="Email" required aria-label="Vendor Email">
        <input type="number" name="price" value="${
          item.price || ""
        }" placeholder="Base Price" step="0.01" min="0" aria-label="Vendor Base Price">
        <div class="address-group">
          <h4>Mailing Address</h4>
          <input type="text" name="mailingStreet" value="${
            item.mailingAddress?.street || ""
          }" placeholder="Street" aria-label="Mailing Street">
          <input type="text" name="mailingCity" value="${
            item.mailingAddress?.city || ""
          }" placeholder="City" aria-label="Mailing City">
          <input type="text" name="mailingState" value="${
            item.mailingAddress?.state || ""
          }" placeholder="State/Province" aria-label="Mailing State">
          <input type="text" name="mailingPostalCode" value="${
            item.mailingAddress?.postalCode || ""
          }" placeholder="Postal/Zip Code" aria-label="Mailing Postal Code">
        </div>
        <select name="status" required aria-label="Vendor Status">
          <option value="Active" ${
            item.status === "Active" ? "selected" : ""
          }>Active</option>
          <option value="Inactive" ${
            item.status === "Inactive" ? "selected" : ""
          }>Inactive</option>
        </select>
        <textarea name="notes" placeholder="Notes" aria-label="Vendor Notes">${
          item.notes || ""
        }</textarea>
      `,
      product: `
        <input type="hidden" name="id" value="${item.id || ""}">
        <input type="text" name="name" value="${
          item.name || ""
        }" placeholder="Name" required aria-label="Product Name">
        <input type="number" name="price" value="${
          item.price || ""
        }" placeholder="Base Price" step="0.01" min="0" aria-label="Product Base Price">
        <input type="number" name="stock" value="${
          item.stock || 0
        }" placeholder="Total Stock" min="0" required aria-label="Total Stock">
        <h3>Vendor Pricing</h3>
        <div id="vendorPricing">
          ${item.id ? this.getProductVendorPricing(item.id) : ""}
        </div>
        <button type="button" class="btn secondary" id="addVendorPrice" ${
          !item.id ? "disabled" : ""
        }>
          Add Vendor Price
        </button>
        <textarea name="notes" placeholder="Notes" aria-label="Product Notes">${
          item.notes || ""
        }</textarea>
      `,
      task: `
        <input type="hidden" name="id" value="${item.id || ""}">
        <input type="text" name="title" value="${
          item.title || ""
        }" placeholder="Title" required aria-label="Task Title">
        <select name="customer" required aria-label="Task Customer">
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
        }" required aria-label="Due Date">
        <select name="priority" required aria-label="Task Priority">
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
        <select name="status" required aria-label="Task Status">
          <option value="Pending" ${
            item.status === "Pending" ? "selected" : ""
          }>Pending</option>
          <option value="Completed" ${
            item.status === "Completed" ? "selected" : ""
          }>Completed</option>
        </select>
        <textarea name="notes" placeholder="Notes" aria-label="Task Notes">${
          item.notes || ""
        }</textarea>
      `,
    }[type];

    const form = document.getElementById("crudForm");
    form.onsubmit = (e) => {
      e.preventDefault();
      const formData = Object.fromEntries(new FormData(e.target));
      if (!this.validateForm(type, formData)) return;

      // Structure addresses for customers
      if (type === "customer") {
        formData.mailingAddress = {
          street: formData.mailingStreet || "",
          city: formData.mailingCity || "",
          state: formData.mailingState || "",
          postalCode: formData.mailingPostalCode || "",
        };
        formData.deliveryAddress = {
          street: formData.deliveryStreet || "",
          city: formData.deliveryCity || "",
          state: formData.deliveryState || "",
          postalCode: formData.deliveryPostalCode || "",
        };
        formData.billingAddress = {
          street: formData.billingStreet || "",
          city: formData.billingCity || "",
          state: formData.billingState || "",
          postalCode: formData.billingPostalCode || "",
        };
        delete formData.mailingStreet;
        delete formData.mailingCity;
        delete formData.mailingState;
        delete formData.mailingPostalCode;
        delete formData.deliveryStreet;
        delete formData.deliveryCity;
        delete formData.deliveryState;
        delete formData.deliveryPostalCode;
        delete formData.billingStreet;
        delete formData.billingCity;
        delete formData.billingState;
        delete formData.billingPostalCode;
      }

      // Structure address for vendors
      if (type === "vendor") {
        formData.mailingAddress = {
          street: formData.mailingStreet || "",
          city: formData.mailingCity || "",
          state: formData.mailingState || "",
          postalCode: formData.mailingPostalCode || "",
        };
        delete formData.mailingStreet;
        delete formData.mailingCity;
        delete formData.mailingState;
        delete formData.mailingPostalCode;
      }

      this.saveItem(type, formData);
      modal.style.display = "none";
      form.reset();
      this.renderAll();
    };

    // Setup product-specific event listeners
    if (type === "product") {
      const addVendorPriceBtn = document.getElementById("addVendorPrice");
      if (addVendorPriceBtn) {
        addVendorPriceBtn.addEventListener("click", () => {
          this.showAddVendorPriceForm(
            item.id || form.querySelector('[name="id"]').value
          );
        });
      }
    }

    // Setup customer-specific event listeners
    if (type === "customer") {
      const productSelect = fields.querySelector(".product-select");
      const vendorSelect = fields.querySelector(".vendor-select");
      const priceInput = fields.querySelector('[name="purchasePrice"]');

      if (productSelect) {
        productSelect.addEventListener("change", () => {
          const productId = productSelect.value;
          if (productId) {
            const product = this.getItem("product", Number(productId));
            const supplyingVendors = this.getProductVendors(Number(productId));
            if (vendorSelect) {
              vendorSelect.innerHTML = `
                <option value="">Select Vendor</option>
                ${supplyingVendors
                  .map(
                    (v) => `
                      <option value="${v.vendorId}" data-price="${v.price}">
                        ${this.getItem("vendor", v.vendorId).name}: $${Number(
                      v.price
                    ).toFixed(2)} (Stock: ${v.stock})
                      </option>
                    `
                  )
                  .join("")}
              `;
            }
          } else {
            if (vendorSelect)
              vendorSelect.innerHTML =
                '<option value="">Select Vendor</option>';
            if (priceInput) priceInput.value = "";
          }
        });

        if (vendorSelect && priceInput) {
          vendorSelect.addEventListener("change", () => {
            const selectedOption =
              vendorSelect.options[vendorSelect.selectedIndex];
            priceInput.value = selectedOption?.dataset.price || "";
          });
        }
      }
    }

    modal.style.display = "flex";
  }

  getProductVendorPricing(productId) {
    const vendors = this.getProductVendors(productId);
    const product = this.getItem("product", productId);
    if (vendors.length === 0)
      return `<p>No vendor pricing set. Base Price: $${
        product.price ? Number(product.price).toFixed(2) : "Not set"
      }</p>`;

    return vendors
      .map((vendor) => {
        const vendorInfo = this.getItem("vendor", vendor.vendorId);
        return `
        <div class="vendor-supply">
          <p><strong>${vendorInfo.name}</strong></p>
          <p>Price: $${Number(vendor.price).toFixed(2)}</p>
          <p>Stock: ${vendor.stock}</p>
          <p>Wait Time: ${vendor.waitTime} days</p>
          <p>Delivery Time: ${vendor.deliveryTime} days</p>
          <button class="btn" data-action="editVendorPrice" data-product-id="${productId}" data-vendor-id="${
          vendor.vendorId
        }">
            Edit
          </button>
          <button class="btn delete" data-action="deleteVendorPrice" data-product-id="${productId}" data-vendor-id="${
          vendor.vendorId
        }">
            Delete
          </button>
        </div>
      `;
      })
      .join("");
  }

  showAddVendorPriceForm(productId) {
    const modal = document.getElementById("modal");
    const title = document.getElementById("modalTitle");
    const fields = document.getElementById("formFields");

    title.textContent = "Add Vendor Pricing";
    fields.innerHTML = `
      <input type="hidden" name="productId" value="${productId}">
      <select name="vendorId" required aria-label="Select Vendor">
        <option value="">Select Vendor</option>
        ${this.data.vendors
          .map((v) => `<option value="${v.id}">${v.name}</option>`)
          .join("")}
      </select>
      <input type="number" name="price" placeholder="Price" step="0.01" min="0" required>
      <input type="number" name="stock" placeholder="Stock" min="0" required>
      <input type="number" name="waitTime" placeholder="Wait Time (days)" min="0" required>
      <input type="number" name="deliveryTime" placeholder="Delivery Time (days)" min="0" required>
    `;

    const form = document.getElementById("crudForm");
    form.onsubmit = (e) => {
      e.preventDefault();
      const formData = Object.fromEntries(new FormData(e.target));

      this.addVendorSupply(
        Number(formData.vendorId),
        Number(formData.productId),
        Number(formData.waitTime),
        Number(formData.deliveryTime),
        Number(formData.price),
        Number(formData.stock)
      );

      modal.style.display = "none";
      this.renderAll();
    };

    modal.style.display = "flex";
  }

  validateForm(type, formData) {
    if (type === "customer") {
      if (
        !formData.name ||
        !formData.email ||
        !formData.phone ||
        !formData.status
      ) {
        alert("All customer fields are required.");
        return false;
      }
      if (
        formData.productId &&
        (!formData.vendorId || !formData.purchasePrice || !formData.quantity)
      ) {
        alert("All purchase fields are required when adding a purchase.");
        return false;
      }
    } else if (type === "vendor") {
      if (
        !formData.name ||
        !formData.contact ||
        !formData.email ||
        !formData.status
      ) {
        alert("All vendor fields are required.");
        return false;
      }
    } else if (type === "product") {
      if (!formData.name || formData.stock === undefined) {
        alert("Product name and total stock are required.");
        return false;
      }
    } else if (type === "task") {
      if (
        !formData.title ||
        !formData.customer ||
        !formData.dueDate ||
        !formData.priority ||
        !formData.status
      ) {
        alert("All task fields are required.");
        return false;
      }
    }
    return true;
  }

  saveItem(type, formData) {
    const item = {
      ...formData,
      id: formData.id ? Number(formData.id) : Date.now(),
    };

    if (type === "task") item.customer = Number(item.customer);
    if (type === "product") {
      item.stock = Number(item.stock);
      item.price = formData.price ? Number(formData.price) : undefined;
    }
    if (type === "vendor") {
      item.price = formData.price ? Number(formData.price) : undefined;
    }

    const collection = this.data[`${type}s`];
    const index = collection.findIndex((i) => i.id === item.id);

    if (index === -1) {
      if (type === "product") item.vendors = [];
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
      collection[index] = { ...item, vendors: oldItem.vendors || [] };
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

    this.saveData();
  }

  addVendorSupply(
    vendorId,
    productId,

    waitTime,
    deliveryTime,
    price,
    stock
  ) {
    this.data.relationships.vendorSupplies[vendorId] =
      this.data.relationships.vendorSupplies[vendorId] || [];

    const existingSupplyIndex = this.data.relationships.vendorSupplies[
      vendorId
    ].findIndex((s) => s.productId === productId);

    if (existingSupplyIndex !== -1) {
      this.data.relationships.vendorSupplies[vendorId][existingSupplyIndex] = {
        productId,
        waitTime,
        deliveryTime,
        price,
        stock,
      };
    } else {
      this.data.relationships.vendorSupplies[vendorId].push({
        productId,
        waitTime,
        deliveryTime,
        price,
        stock,
      });
    }

    const product = this.getItem("product", productId);
    const existingVendorIndex = product.vendors.findIndex(
      (v) => v.vendorId === vendorId
    );

    if (existingVendorIndex !== -1) {
      product.vendors[existingVendorIndex] = {
        vendorId,
        price,
        waitTime,
        deliveryTime,
        stock,
      };
    } else {
      product.vendors.push({
        vendorId,
        price,
        waitTime,
        deliveryTime,
        stock,
      });
    }

    product.stock = product.vendors.reduce((sum, v) => sum + (v.stock || 0), 0);

    this.saveData();
  }

  getItem(type, id) {
    return this.data[`${type}s`].find((i) => i.id === id) || {};
  }

  deleteItem(type, id) {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
      this.data[`${type}s`] = this.data[`${type}s`].filter((i) => i.id !== id);
      delete this.data.history[`${type}s`][id];

      if (type === "customer") {
        delete this.data.relationships.customerPurchases[id];
      }
      if (type === "vendor") {
        this.data.products.forEach((p) => {
          p.vendors = p.vendors.filter((v) => v.vendorId !== id);
          p.stock = p.vendors.reduce((sum, v) => sum + (v.stock || 0), 0);
        });
        delete this.data.relationships.vendorSupplies[id];
      }
      if (type === "product") {
        Object.keys(this.data.relationships.vendorSupplies).forEach(
          (vendorId) => {
            this.data.relationships.vendorSupplies[vendorId] =
              this.data.relationships.vendorSupplies[vendorId].filter(
                (s) => s.productId !== id
              );
          }
        );
      }

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
        <p>Mailing Address: ${item.mailingAddress?.street || "Not provided"}, ${
        item.mailingAddress?.city || ""
      }, ${item.mailingAddress?.state || ""} ${
        item.mailingAddress?.postalCode || ""
      }</p>
        <p>Delivery Address: ${
          item.deliveryAddress?.street || "Not provided"
        }, ${item.deliveryAddress?.city || ""}, ${
        item.deliveryAddress?.state || ""
      } ${item.deliveryAddress?.postalCode || ""}</p>
        <p>Billing Address: ${item.billingAddress?.street || "Not provided"}, ${
        item.billingAddress?.city || ""
      }, ${item.billingAddress?.state || ""} ${
        item.billingAddress?.postalCode || ""
      }</p>
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
                  <p>Date: ${new Date(p.date).toLocaleString()}</p>
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
        <p>Base Price: $${
          item.price ? Number(item.price).toFixed(2) : "Not set"
        }</p>
        <p>Mailing Address: ${item.mailingAddress?.street || "Not provided"}, ${
        item.mailingAddress?.city || ""
      }, ${item.mailingAddress?.state || ""} ${
        item.mailingAddress?.postalCode || ""
      }</p>
        <p>Status: ${item.status}</p>
        <p>Notes: ${item.notes || "None"}</p>
        <h3>Supplied Products</h3>
        ${
          this.getVendorSupplies(id)
            .map((s) => {
              const product = this.getItem("product", s.productId);
              return `
                <div class="relationship-item">
                  <p>Product: ${product.name || "Unknown"}</p>
                  <p>Price: $${Number(s.price).toFixed(2)}</p>
                  <p>Stock: ${s.stock}</p>
                  <p>Wait Time: ${s.waitTime} days</p>
                  <p>Delivery Time: ${s.deliveryTime} days</p>
                </div>
              `;
            })
            .join("") || "No products supplied"
        }
      `,
      product: () => `
        <h3>Current Details</h3>
        <p>Name: ${item.name}</p>
        <p>Base Price: $${
          item.price ? Number(item.price).toFixed(2) : "Not set"
        }</p>
        <p>Total Stock: ${item.stock}</p>
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
                  <p>Price: $${Number(v.price).toFixed(2)}</p>
                  <p>Stock: ${v.stock}</p>
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
                  <p>Date: ${new Date(c.date).toLocaleString()}</p>
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
          this.getItem("customer", Number(item.customer)).name || "Unknown"
        }</p>
        <p>Due Date: ${new Date(item.dueDate).toLocaleDateString()}</p>
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
                  <p>Timestamp: ${new Date(h.timestamp).toLocaleString()}</p>
                  <p>Changes: ${JSON.stringify(h.changes)}</p>
                </div>
              `
            )
            .join("") || "No history available"
        }
      `;
    modal.style.display = "flex";
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
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .map(
            (n) => `
              <div class="history-item">
                <p>Timestamp: ${new Date(n.timestamp).toLocaleString()}</p>
                <p>Note: ${n.text}</p>
                <span class="delete-note" data-delete-note-id="${
                  n.id
                }" aria-label="Delete Note">🗑️</span>
              </div>
            `
          )
          .join("") || "No notes available"
      }
    `;
    modal.style.display = "flex";
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
                  <p>Mailing Address: ${
                    c.mailingAddress?.street || "Not provided"
                  }, ${c.mailingAddress?.city || ""}, ${
                c.mailingAddress?.state || ""
              } ${c.mailingAddress?.postalCode || ""}</p>
                  <p>Delivery Address: ${
                    c.deliveryAddress?.street || "Not provided"
                  }, ${c.deliveryAddress?.city || ""}, ${
                c.deliveryAddress?.state || ""
              } ${c.deliveryAddress?.postalCode || ""}</p>
                  <p>Billing Address: ${
                    c.billingAddress?.street || "Not provided"
                  }, ${c.billingAddress?.city || ""}, ${
                c.billingAddress?.state || ""
              } ${c.billingAddress?.postalCode || ""}</p>
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
                  <p>Mailing Address: ${
                    c.mailingAddress?.street || "Not provided"
                  }, ${c.mailingAddress?.city || ""}, ${
                c.mailingAddress?.state || ""
              } ${c.mailingAddress?.postalCode || ""}</p>
                  <p>Delivery Address: ${
                    c.deliveryAddress?.street || "Not provided"
                  }, ${c.deliveryAddress?.city || ""}, ${
                c.deliveryAddress?.state || ""
              } ${c.deliveryAddress?.postalCode || ""}</p>
                  <p>Billing Address: ${
                    c.billingAddress?.street || "Not provided"
                  }, ${c.billingAddress?.city || ""}, ${
                c.billingAddress?.state || ""
              } ${c.billingAddress?.postalCode || ""}</p>
                  <p>Notes: ${c.notes || "None"}</p>
                  <h4>Purchased Products</h4>
                  ${
                    this.getCustomerPurchases(c.id)
                      .map(
                        (p) => `
                          <div class="purchase-item">
                            <p>Product: ${
                              this.getItem("product", p.productId).name ||
                              "Unknown"
                            }</p>
                            <p>Vendor: ${
                              this.getItem("vendor", p.vendorId).name ||
                              "Unknown"
                            }</p>
                            <p>Price: $${Number(p.price).toFixed(2)}</p>
                            <p>Quantity: ${p.quantity}</p>
                            <p>Date: ${new Date(p.date).toLocaleString()}</p>
                          </div>
                        `
                      )
                      .join("") || "No purchases"
                  }
                </div>
              `
            )
            .join("") || "No active customers"
        }
      `,
      inactiveCustomers: () => `
        <h3>Inactive Customers (${
          this.data.customers.filter((c) => c.status === "Inactive").length
        })</h3>
        ${
          this.data.customers
            .filter((c) => c.status === "Inactive")
            .map(
              (c) => `
                <div class="relationship-item">
                  <p>Name: ${c.name}</p>
                  <p>Email: ${c.email}</p>
                  <p>Mailing Address: ${
                    c.mailingAddress?.street || "Not provided"
                  }, ${c.mailingAddress?.city || ""}, ${
                c.mailingAddress?.state || ""
              } ${c.mailingAddress?.postalCode || ""}</p>
                  <p>Delivery Address: ${
                    c.deliveryAddress?.street || "Not provided"
                  }, ${c.deliveryAddress?.city || ""}, ${
                c.deliveryAddress?.state || ""
              } ${c.deliveryAddress?.postalCode || ""}</p>
                  <p>Billing Address: ${
                    c.billingAddress?.street || "Not provided"
                  }, ${c.billingAddress?.city || ""}, ${
                c.billingAddress?.state || ""
              } ${c.billingAddress?.postalCode || ""}</p>
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
                  <p>Base Price: $${
                    v.price ? Number(v.price).toFixed(2) : "Not set"
                  }</p>
                  <p>Mailing Address: ${
                    v.mailingAddress?.street || "Not provided"
                  }, ${v.mailingAddress?.city || ""}, ${
                v.mailingAddress?.state || ""
              } ${v.mailingAddress?.postalCode || ""}</p>
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
                  <p>Base Price: $${
                    p.price ? Number(p.price).toFixed(2) : "Not set"
                  }</p>
                  <p>Vendors & Prices:</p>
                  <ul>
                    ${p.vendors
                      .map(
                        (v) =>
                          `<li>${
                            this.getItem("vendor", v.vendorId).name
                          }: $${Number(v.price).toFixed(2)} (Stock: ${
                            v.stock
                          })</li>`
                      )
                      .join("")}
                  </ul>
                  <p>Total Stock: ${p.stock}</p>
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
                  <p>Base Price: $${
                    p.price ? Number(p.price).toFixed(2) : "Not set"
                  }</p>
                  <p>Vendors & Prices:</p>
                  <ul>
                    ${p.vendors
                      .map(
                        (v) =>
                          `<li>${
                            this.getItem("vendor", v.vendorId).name
                          }: $${Number(v.price).toFixed(2)} (Stock: ${
                            v.stock
                          })</li>`
                      )
                      .join("")}
                  </ul>
                  <p>Total Stock: ${p.stock}</p>
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
            .filter((t) => t.priority === "High" && t.status === "Pending")
            .map(
              (t) => `
                <div class="relationship-item">
                  <p>Title: ${t.title}</p>
                  <p>Customer: ${
                    this.getItem("customer", Number(t.customer)).name ||
                    "Unknown"
                  }</p>
                  <p>Due Date: ${new Date(t.dueDate).toLocaleDateString()}</p>
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
    modal.style.display = "flex";
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
      if (
        key === "mailingAddress" ||
        key === "deliveryAddress" ||
        key === "billingAddress"
      ) {
        for (const subKey in newItem[key]) {
          if (oldItem[key]?.[subKey] !== newItem[key][subKey]) {
            changes[key] = changes[key] || {};
            changes[key][subKey] = {
              from: oldItem[key]?.[subKey],
              to: newItem[key][subKey],
            };
          }
        }
      } else if (
        key !== "id" &&
        key !== "vendors" &&
        oldItem[key] !== newItem[key]
      ) {
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
              }" aria-label="Edit Customer">Edit</button>
              <button class="btn" data-action="delete" data-type="customer" data-id="${
                c.id
              }" aria-label="Delete Customer">Delete</button>
              <button class="btn" data-action="recall" data-type="customer" data-id="${
                c.id
              }" aria-label="Recall Customer">Recall</button>
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
              }" aria-label="Edit Vendor">Edit</button>
              <button class="btn" data-action="delete" data-type="vendor" data-id="${
                v.id
              }" aria-label="Delete Vendor">Delete</button>
              <button class="btn" data-action="recall" data-type="vendor" data-id="${
                v.id
              }" aria-label="Recall Vendor">Recall</button>
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
            <td>
              <select class="vendor-price-select" data-product-id="${
                p.id
              }" aria-label="Select Vendor for ${p.name}">
                <option value="">Select Vendor</option>
                ${this.data.vendors
                  .map(
                    (v) => `
                      <option value="${v.id}">
                        ${v.name}: $${
                      p.vendors.find((pv) => pv.vendorId === v.id)?.price
                        ? Number(
                            p.vendors.find((pv) => pv.vendorId === v.id).price
                          ).toFixed(2)
                        : v.price
                        ? Number(v.price).toFixed(2)
                        : "Not set"
                    } (Stock: ${
                      p.vendors.find((pv) => pv.vendorId === v.id)?.stock || 0
                    })
                      </option>
                    `
                  )
                  .join("")}
              </select>
            </td>
            <td>${p.stock}</td>
            <td class="notes">${p.notes || ""}</td>
            <td>
              <button class="btn" data-action="edit" data-type="product" data-id="${
                p.id
              }" aria-label="Edit Product">Edit</button>
              <button class="btn" data-action="delete" data-type="product" data-id="${
                p.id
              }" aria-label="Delete Product">Delete</button>
              <button class="btn" data-action="recall" data-type="product" data-id="${
                p.id
              }" aria-label="Recall Product">Recall</button>
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
            <td>${new Date(t.dueDate).toLocaleDateString()}</td>
            <td>${t.priority}</td>
            <td>${t.status}</td>
            <td class="notes">${t.notes || ""}</td>
            <td>
              <button class="btn" data-action="edit" data-type="task" data-id="${
                t.id
              }" aria-label="Edit Task">Edit</button>
              <button class="btn" data-action="delete" data-type="task" data-id="${
                t.id
              }" aria-label="Delete Task">Delete</button>
              <button class="btn" data-action="recall" data-type="task" data-id="${
                t.id
              }" aria-label="Recall Task">Recall</button>
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
    let filteredNotes = this.data.analyticsNotes.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
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
              <p><strong>${new Date(n.timestamp).toLocaleString()}</strong></p>
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
    try {
      Object.entries(this.data).forEach(([key, value]) => {
        if (key === "loggedInUsers") {
          localStorage.setItem(`crm_${key}`, JSON.stringify([...value]));
        } else {
          localStorage.setItem(`crm_${key}`, JSON.stringify(value));
        }
      });
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Failed to save data. Check console for details.");
    }
  }

  loadData() {
    try {
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
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Failed to load data. Starting with defaults.");
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
        loggedInUsers: new Set(),
      };
    }
  }

  exportData() {
    const exportData = {
      ...this.data,
      loggedInUsers: [...this.data.loggedInUsers],
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm_data_${new Date().toISOString().split("T")[0]}.json`;
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
        alert("Data imported successfully!");
      } catch (error) {
        console.error("Error importing data:", error);
        alert("Error importing data: " + error.message);
      }
      event.target.value = null;
    };
    reader.readAsText(file);
  }
}

const crm = new CRM();
window.crm = crm;

// Initial display setup
document.getElementById("loginContainer").classList.add("active");
document.getElementById("mainContainer").classList.remove("active");
