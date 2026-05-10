const API = "https://vehicle-parking-management-system-2-8cqz.onrender.com/api";


// SECTION SWITCH

function showSection(id,btn){

    document.querySelectorAll(".page")
    .forEach(page=>{
        page.classList.remove("active");
    });

    document.querySelectorAll(".menu")
    .forEach(menu=>{
        menu.classList.remove("active");
    });

    document.getElementById(id)
    .classList.add("active");

    btn.classList.add("active");

    document.getElementById("page-title")
    .innerText = id.charAt(0).toUpperCase()+id.slice(1);

    if(id==="bookings") loadBookings();
    if(id==="slots") loadSlots();
    if(id==="users") loadUsers();
}



// API CALL

async function apiFetch(endpoint){

    const token = localStorage.getItem("token");

    const res = await fetch(API + endpoint,{
        headers:{
            "Content-Type":"application/json",
            Authorization:`Bearer ${token}`
        }
    });

    return await res.json();
}



// DASHBOARD

async function loadDashboard(){

    const data = await apiFetch("/admin/dashboard");

    document.getElementById("totalSlots")
    .innerText = data.total_slots;

    document.getElementById("availableSlots")
    .innerText = data.available_slots;

    document.getElementById("totalBookings")
    .innerText = data.total_bookings;

    document.getElementById("totalRevenue")
    .innerText = "₹" + data.total_revenue;
}



// BOOKINGS

async function loadBookings(){

    const data = await apiFetch("/admin/bookings");

    const body = document.getElementById("bookingsBody");

    body.innerHTML = "";

    data.forEach(b=>{

        body.innerHTML += `
        <tr>

            <td>${b.id}</td>

            <td>${b.user_name}</td>

            <td>${b.slot_number}</td>

            <td>${formatDate(b.check_in)}</td>

            <td>${formatDate(b.check_out)}</td>

            <td>
                <span class="status ${b.status}">
                    ${b.status}
                </span>
            </td>

        </tr>
        `;
    });

}



// SLOTS

async function loadSlots(){

    const data = await apiFetch("/booking/slots");

    const body = document.getElementById("slotsBody");

    body.innerHTML = "";

    data.forEach(slot=>{

        body.innerHTML += `
        <tr>

            <td>${slot.id}</td>

            <td>${slot.slot_number}</td>

            <td>${slot.vehicle_type}</td>

            <td>
                <span class="status ${slot.status}">
                    ${slot.status}
                </span>
            </td>

        </tr>
        `;
    });

}



// USERS

async function loadUsers(){

    const data = await apiFetch("/admin/users");

    const body = document.getElementById("usersBody");

    body.innerHTML = "";

    data.forEach(user=>{

        body.innerHTML += `
        <tr>

            <td>${user.id}</td>

            <td>${user.name}</td>

            <td>${user.email}</td>

            <td>${user.role}</td>

        </tr>
        `;
    });

}



// FORMAT DATE

function formatDate(date){

    return new Date(date)
    .toLocaleString();
}



// LOGOUT

function logout(){

    localStorage.removeItem("token");

    window.location = "login.html";
}



// INIT

loadDashboard();