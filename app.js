/**
 * Hostel Management System
 * A vanilla JS single-page application for managing a hostel.
 */
document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    const modal = document.getElementById('room-modal');

    // --- ROUTING ---
    const routes = {
        '': 'welcome-template',
        '#home': 'welcome-template',
        '#admin': 'admin-login-template',
        '#admin/dashboard': 'admin-dashboard-template',
        '#student': 'student-login-template',
        '#student/dashboard': 'student-dashboard-template',
        '#student/my-requests': 'student-dashboard-template',
        '#public': 'public-template',
        '#notices': 'notices-template'
    };

    // --- DATA MANAGEMENT ---

    /**
     * Initializes sample data in localStorage if it doesn't exist.
     * This provides a default state for the application on first run.
     */
    function initializeData() {
        const dataVersion = "1.4"; // Added monthly fees
        let data = JSON.parse(localStorage.getItem('hostelData'));

        if (!data || data.version !== dataVersion) {
            if (!data) {
                const students = [];
                const rooms = [];
                const floors = 19;
                const roomsPerFloor = 17;
                let studentIdCounter = 1;

                for (let f = 1; f <= floors; f++) {
                    for (let r = 1; r <= roomsPerFloor; r++) {
                        const roomId = `${f}${String(r).padStart(2, '0')}`;
                        let type, capacity;
                        if (r <= 4) { type = 1; capacity = 1; }
                        else if (r <= 13) { type = 2; capacity = 2; }
                        else { type = 3; capacity = 3; }

                        const room = { roomId, floor: f, type, capacity, occupants: [] };

                        if (f < 3 && Math.random() > 0.3) {
                            const numOccupants = capacity;
                            for (let i = 0; i < numOccupants; i++) {
                                if (room.occupants.length < capacity) {
                                    const studentId = `STU${String(studentIdCounter++).padStart(3, '0')}`;
                                    students.push({
                                        allotmentId: studentId,
                                        name: `Student ${studentIdCounter - 1}`,
                                        dept: ['CSE', 'ECE', 'ME', 'CE'][Math.floor(Math.random() * 4)],
                                        roomId: roomId,
                                        year: [1, 2, 3, 4][Math.floor(Math.random() * 4)],
                                        photoUrl: `https://i.pravatar.cc/100?u=${studentId}`
                                    });
                                    room.occupants.push(studentId);
                                }
                            }
                        }
                        rooms.push(room);
                    }
                }

                data = {
                    version: dataVersion,
                    students: students,
                    rooms: rooms,
                    notices: [
                        { noticeId: 'N001', title: 'Water Supply Disruption', body: 'Water supply will be interrupted tomorrow from 10 AM to 1 PM for maintenance.', date: '2025-11-10', stampUrl: 'assets\logo.jpeg' },
                        { noticeId: 'N002', title: 'Diwali Celebration', body: 'Join us for the Diwali celebration in the common room at 7 PM.', date: '2025-11-09', stampUrl: 'assets/logo.jpeg' },
                    ],
                    complaints: [],
                    invoices: [],
                    allotments: students.filter(s => s.roomId).map(s => ({
                        studentId: s.allotmentId,
                        roomNo: s.roomId,
                        paymentStatus: 'Paid',
                        allottedBy: 'Hostel Chairman',
                        date: '2025-10-01'
                    })),
                    roomChangeRequests: [],
                    monthlyFees: []
                };
                
                // Add sample fees for the first few students
                if (data.students.length > 0) {
                    data.monthlyFees.push({ feeId: `FEE${Date.now()}1`, studentId: data.students[0].allotmentId, studentName: data.students[0].name, month: 'October 2025', amount: 3000, status: 'Paid', date: '2025-10-05' });
                }
                if (data.students.length > 1) {
                    data.monthlyFees.push({ feeId: `FEE${Date.now()}2`, studentId: data.students[1].allotmentId, studentName: data.students[1].name, month: 'October 2025', amount: 3000, status: 'Due', date: '2025-10-05' });
                }

            } else {
                data.version = dataVersion;
                if (!data.invoices) data.invoices = [];
                if (!data.roomChangeRequests) data.roomChangeRequests = [];
                if (!data.monthlyFees) data.monthlyFees = [];
            }
            
            localStorage.setItem('hostelData', JSON.stringify(data));
        }
    }


    function getData() {
        return JSON.parse(localStorage.getItem('hostelData'));
    }

    function saveData(data) {
        localStorage.setItem('hostelData', JSON.stringify(data));
    }


    // --- ROUTING & RENDERING ---

    function renderPage(templateId) {
        const template = document.getElementById(templateId);
        if (template) {
            app.innerHTML = '';
            app.appendChild(template.content.cloneNode(true));
        } else {
            app.innerHTML = '<h1>Page not found</h1>';
        }
    }

    function router() {
        const path = window.location.hash || '#home';
        
        if (path.startsWith('#admin/') && !sessionStorage.getItem('adminLoggedIn')) {
            window.location.hash = '#admin';
            return;
        }

        if (path.startsWith('#student/') && !sessionStorage.getItem('studentLoggedIn')) {
            window.location.hash = '#student';
            return;
        }

        let templateId;
        if (path.startsWith('#admin/')) {
            templateId = routes['#admin/dashboard'];
        } else if (path.startsWith('#student/')) {
            templateId = routes['#student/dashboard'];
        } else {
            templateId = routes[path];
        }

        renderPage(templateId || 'welcome-template');
        executePageScript(path);
    }

    function executePageScript(path) {
        document.querySelectorAll('.main-nav a, .sidebar-nav a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === path) {
                link.classList.add('active');
            }
        });

        if (path.startsWith('#admin/')) {
            renderAdminDashboard(path);
        } else if (path === '#student/my-requests') {
            renderStudentRoomRequests(document.querySelector('.main-content'));
        } else if (path.startsWith('#student/')) {
            renderStudentDashboard(path);
        } else if (path === '#public') {
            renderPublicRooms();
        } else if (path === '#notices') {
            renderPublicNoticesPage();
        } else if (path === '#admin') {
            attachAdminLoginEvents();
        } else if (path === '#student') {
            attachStudentLoginEvents();
        }
    }


    // --- PUBLIC ROOMS VIEW ---

    function renderPublicRooms() {
        const container = document.getElementById('room-grid-container');
        if (!container) return;

        const { rooms } = getData();
        let gridHtml = '';
        const floors = 19;

        for (let f = 1; f <= floors; f++) {
            gridHtml += `<div class="floor-label">Floor ${f}</div>`;
            const roomsOnFloor = rooms.filter(r => r.floor === f);
            roomsOnFloor.forEach(room => {
                let status = 'vacant';
                if (room.occupants.length === room.capacity) {
                    status = 'full';
                } else if (room.occupants.length > 0) {
                    status = 'partial';
                }
                gridHtml += `<div class="room-box ${status}" data-room-id="${room.roomId}">${room.roomId}</div>`;
            });
        }
        container.innerHTML = gridHtml;

        container.querySelectorAll('.room-box').forEach(box => {
            box.addEventListener('click', () => showRoomModal(box.dataset.roomId));
        });
    }

    function showRoomModal(roomId) {
        const { rooms, students } = getData();
        const room = rooms.find(r => r.roomId === roomId);
        if (!room) return;

        document.getElementById('modal-room-number').innerText = `Room ${room.roomId}`;
        const detailsContainer = document.getElementById('modal-room-details');

        let statusText, statusClass;
        if (room.occupants.length === 0) {
            statusText = 'Completely Vacant';
            statusClass = 'vacant';
        } else if (room.occupants.length < room.capacity) {
            statusText = 'Partially Occupied';
            statusClass = 'partial';
        } else {
            statusText = 'Full';
            statusClass = 'full';
        }

        let occupantsHtml = '<h6>No occupants</h6>';
        if (room.occupants.length > 0) {
            occupantsHtml = '<h6>Occupants:</h6><ul>';
            room.occupants.forEach(studentId => {
                const student = students.find(s => s.allotmentId === studentId);
                occupantsHtml += `<li>${student ? student.name : 'Unknown Student'}</li>`;
            });
            occupantsHtml += '</ul>';
        }

        detailsContainer.innerHTML = `
            <p><strong>Floor:</strong> ${room.floor}</p>
            <p><strong>Seater Type:</strong> ${room.type}-Seater</p>
            <p><strong>Capacity:</strong> ${room.capacity}</p>
            <p><strong>Status:</strong> <span class="status status-${statusClass}">${statusText}</span></p>
            ${occupantsHtml}
        `;

        modal.classList.add('visible');
    }

    function hideRoomModal() {
        modal.classList.remove('visible');
    }


    // --- STUDENT DASHBOARD ---

    function renderStudentDashboard(path) {
        const container = document.querySelector('.main-content');
        if (!container) return;

        const studentId = sessionStorage.getItem('studentLoggedIn');
        const { students } = getData();
        const student = students.find(s => s.allotmentId === studentId);

        if (path === '#student/dashboard') {
            container.innerHTML = `
                <h1>My Dashboard</h1>
                <div class="card">
                    <h3>Allotment Details</h3>
                    <p><strong>Name:</strong> ${student.name}</p>
                    <p><strong>Allotment ID:</strong> ${student.allotmentId}</p>
                    <p><strong>Room No:</strong> ${student.roomId}</p>
                    <p><strong>Department:</strong> ${student.dept}</p>
                    <button id="download-allotment-letter" class="btn-primary" style="margin-top: 1rem;">Download Allotment Letter</button>
                </div>
            `;
            document.getElementById('download-allotment-letter').addEventListener('click', () => {
                const data = getData();
                const allotment = data.allotments.find(a => a.studentId === student.allotmentId);
                if (student && allotment) {
                    printAllotmentReceipt(allotment, student);
                } else {
                    alert('Could not find allotment details to print.');
                }
            });
        } else if (path === '#student/complaint') {
            container.innerHTML = `
                <h1>New Complaint</h1>
                <div class="card">
                    <form id="complaint-form">
                        <div class="form-group"><label for="complaint-title">Title</label><input type="text" id="complaint-title" required></div>
                        <div class="form-group"><label for="complaint-body">Description</label><textarea id="complaint-body" rows="5" required></textarea></div>
                        <button type="submit" class="btn-primary">Submit Complaint</button>
                    </form>
                </div>
            `;
            document.getElementById('complaint-form').addEventListener('submit', handleNewComplaint);
        } else if (path === '#student/complaints') {
            renderStudentComplaints(container);
        } else if (path === '#student/room-change') {
            container.innerHTML = `
                <h1>Request Room Change</h1>
                <div class="card">
                    <form id="room-change-form">
                        <div class="form-group"><label for="desired-room">Desired Room Number</label><input type="text" id="desired-room" required></div>
                        <div class="form-group"><label for="change-reason">Reason for Change</label><textarea id="change-reason" rows="4" required></textarea></div>
                        <button type="submit" class="btn-primary">Submit Request</button>
                    </form>
                </div>
            `;
            document.getElementById('room-change-form').addEventListener('submit', handleRoomChangeRequest);
        } else if (path === '#student/my-requests') {
            renderStudentRoomRequests(container);
        } else if (path === '#student/fees') {
            renderStudentFees(container);
        }
    }
    
    function renderStudentComplaints(container) {
        const studentId = sessionStorage.getItem('studentLoggedIn');
        const data = getData();
        const studentComplaints = data.complaints.filter(c => c.fromAllotmentId === studentId);

        container.innerHTML = `
            <h1>My Complaint History</h1>
            <div class="card table-container">
                <table class="data-table">
                     <thead><tr><th>Complaint ID</th><th>Title</th><th>Date Submitted</th><th>Status</th><th>Actions</th></tr></thead>
                     <tbody>
                        ${studentComplaints.map(c => `
                            <tr>
                                <td>${c.complaintId}</td>
                                <td>${c.title}</td>
                                <td>${c.date}</td>
                                <td><span class="status status-${c.status.toLowerCase().replace('-','')}">${c.status}</span></td>
                                <td>
                                    ${c.status === 'Resolved' ? `<button class="btn btn-secondary btn-sm download-resolution" data-complaint-id="${c.complaintId}">Download Receipt</button>` : 'N/A'}
                                </td>
                            </tr>
                        `).join('')}
                     </tbody>
                </table>
            </div>`;
        
        container.querySelectorAll('.download-resolution').forEach(button => {
            button.addEventListener('click', e => {
                printComplaintResolution(e.target.dataset.complaintId);
            });
        });
    }

    function printComplaintResolution(complaintId) {
        const data = getData();
        const complaint = data.complaints.find(c => c.complaintId === complaintId);
        if (!complaint) return;

        const student = data.students.find(s => s.allotmentId === complaint.fromAllotmentId);
        const receiptWindow = window.open('', '_blank');
        receiptWindow.document.write(`
            <html><head><title>Complaint Resolution - ${complaint.complaintId}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; } .receipt-container { max-width: 800px; margin: 2rem auto; padding: 2rem; border: 1px solid #ccc; box-shadow: 0 0 10px rgba(0,0,0,0.1); position: relative; }
                .receipt-header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 1rem; margin-bottom: 2rem; } .receipt-header h1 { color: #007bff; margin: 0; }
                .details-table { width: 100%; border-collapse: collapse; margin-top: 1rem; } .details-table td { padding: 0.5rem; border-bottom: 1px solid #eee; }
                .details-table td:first-child { font-weight: 600; width: 150px; }
                .footer { text-align: center; margin-top: 3rem; font-size: 0.9rem; color: #888; }
                .stamp { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 6rem; font-weight: 700; opacity: 0.15; border: 12px solid; padding: 1rem 2rem; border-radius: 10px; z-index: -1; color: #28a745; border-color: #28a745; }
            </style></head><body>
            <div class="receipt-container">
                <div class="receipt-header"><h1>Aliah Hostel</h1><p>Complaint Resolution Receipt</p></div>
                <p><strong>Student:</strong> ${student.name} (${student.allotmentId})</p>
                <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
                <table class="details-table">
                    <tr><td>Submitted:</td><td>${complaint.date}</td></tr>
                    <tr><td>Resolved:</td><td>${complaint.resolutionDate}</td></tr>
                    <tr><td>Title:</td><td>${complaint.title}</td></tr>
                    <tr><td>Description:</td><td>${complaint.body}</td></tr>
                    <tr><td>Status:</td><td><strong>${complaint.status}</strong></td></tr>
                </table>
                <div class="stamp">RESOLVED</div>
                <div class="footer"><p>&copy; ${new Date().getFullYear()} Aliah Hostel</p></div>
            </div>
            <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
            </body></html>`);
        receiptWindow.document.close();
    }

    function handleRoomChangeRequest(e) {
        e.preventDefault();
        const studentId = sessionStorage.getItem('studentLoggedIn');
        const data = getData();
        const student = data.students.find(s => s.allotmentId === studentId);
        const newRequest = { requestId: `RC${Date.now()}`, studentId: studentId, studentName: student.name, currentRoom: student.roomId, desiredRoom: document.getElementById('desired-room').value, reason: document.getElementById('change-reason').value, date: new Date().toISOString().split('T')[0], status: 'Pending', };
        data.roomChangeRequests.unshift(newRequest);
        saveData(data);
        alert('Room change request submitted successfully! You will be notified of the outcome.');
        window.location.hash = '#student/dashboard';
    }

    function renderPublicNoticesPage() {
        const container = document.getElementById('public-notices-container');
        if (!container) return;
        const { notices } = getData();
        if (notices.length === 0) {
            container.innerHTML = '<p>No notices have been published yet.</p>';
            return;
        }
        container.innerHTML = notices.map(notice => `
            <div class="card notice-card">
                <h3>${notice.title}</h3>
                <p class="notice-date">Date: ${notice.date}</p>
                <p>${notice.body}</p>
                <button class="btn btn-primary download-notice" data-notice-id="${notice.noticeId}">Download</button>
            </div>`).join('');
        container.querySelectorAll('.download-notice').forEach(button => {
            button.addEventListener('click', e => {
                printNotice(e.target.dataset.noticeId);
            });
        });
    }

    function printNotice(noticeId) {
        const { notices } = getData();
        const notice = notices.find(n => n.noticeId === noticeId);
        if (!notice) return;
        const receiptWindow = window.open('', '_blank');
        receiptWindow.document.write(`
            <html><head><title>Notice: ${notice.title}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; } .receipt-container { max-width: 800px; margin: 2rem auto; padding: 2rem; border: 1px solid #ccc; box-shadow: 0 0 10px rgba(0,0,0,0.1); position: relative; }
                .receipt-header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 1rem; margin-bottom: 2rem; } .receipt-header h1 { color: #007bff; margin: 0; }
                .notice-title { text-align: center; font-size: 1.8rem; font-weight: 600; margin-bottom: 1rem; } .notice-date { text-align: center; font-style: italic; color: #666; margin-bottom: 2rem; }
                .notice-body { line-height: 1.8; font-size: 1.1rem; text-align: justify; } .footer { text-align: center; margin-top: 3rem; font-size: 0.9rem; color: #888; }
                .stamp { position: absolute; bottom: 80px; right: 40px; width: 150px; height: auto; opacity: 0.6; }
            </style></head><body>
            <div class="receipt-container">
                <div class="receipt-header"><h1>Aliah Hostel</h1><p>Your Home Away From Home</p></div>
                <h2 class="notice-title">${notice.title}</h2><p class="notice-date">Published on: ${new Date(notice.date).toLocaleDateString()}</p>
                <div class="notice-body"><p>${notice.body.replace(/\n/g, '<br>')}</p></div>
                <img src="assets/logo.jpeg" alt="Hostel Stamp" class="stamp">
                <div class="footer"><p>This is an official notice from the hostel administration.</p><p>&copy; ${new Date().getFullYear()} Aliah Hostel</p></div>
            </div>
            <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
            </body></html>`);
        receiptWindow.document.close();
    }
    
    function handleNewComplaint(e) {
        e.preventDefault();
        const studentId = sessionStorage.getItem('studentLoggedIn');
        const data = getData();
        const student = data.students.find(s => s.allotmentId === studentId);
        const newComplaint = { complaintId: `C${Date.now()}`, fromAllotmentId: studentId, roomId: student.roomId, title: document.getElementById('complaint-title').value, body: document.getElementById('complaint-body').value, date: new Date().toISOString().split('T')[0], status: 'New', };
        data.complaints.unshift(newComplaint);
        saveData(data);
        alert('Complaint submitted successfully!');
        window.location.hash = '#student/dashboard';
    }

    // --- ADMIN DASHBOARD ---
    function renderAdminDashboard(path) {
        const container = document.querySelector('.main-content');
        if (!container) return;
        if (path === '#admin/dashboard') { container.innerHTML = '<h1>Admin Dashboard</h1><p>Welcome, Admin! Select an option from the sidebar.</p>'; }
        else if (path === '#admin/allotment') { renderAllotment(container); }
        else if (path === '#admin/requests') { renderRoomChangeRequests(container); }
        else if (path === '#admin/invoices') { renderInvoices(container); }
        else if (path === '#admin/fees') { renderFeeManagement(container); }
        else if (path === '#admin/notices') { renderNotices(container); }
        else if (path === '#admin/complaints') { renderComplaints(container); }
        else if (path === '#student/my-requests') { renderStudentRoomRequests(container); }
    }

    function renderAllotment(container) {
        const data = getData();
        const allottedStudents = data.allotments.map(allotment => ({ ...allotment, student: data.students.find(s => s.allotmentId === allotment.studentId) })).filter(a => a.student);
        container.innerHTML = `
            <h1>Student & Allotment Management</h1>
            <div class="card">
                <h3>Create New Allotment</h3>
                <form id="create-allotment-form">
                    <div class="form-group"><label for="student-id">Student ID (e.g., Roll No)</label><input type="text" id="student-id" required></div>
                    <div class="form-group"><label for="student-name">Name</label><input type="text" id="student-name" required></div>
                    <div class="form-group"><label for="student-dept">Department</label><input type="text" id="student-dept" required></div>
                    <div class="form-group"><label for="student-year">Year</label><input type="number" id="student-year" min="1" max="5" required></div>
                    <div class="form-group"><label for="room-no">Room No.</label><input type="text" id="room-no" required></div>
                    <div class="form-group"><label for="payment-status">Fees Status</label><select id="payment-status" required><option value="Paid">Paid</option><option value="Not Paid" selected>Not Paid</option></select></div>
                    <button type="submit" class="btn-primary">Create Allotment</button>
                </form>
            </div>
            <div class="card table-container">
                <h3>Allotted Students</h3>
                <table class="data-table">
                    <thead><tr><th>Photo</th><th>Student ID</th><th>Name</th><th>Room No</th><th>Fees Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${allottedStudents.map(a => `
                            <tr>
                                <td><img src="${a.student.photoUrl}" alt="${a.student.name}" class="student-photo-thumb"></td><td>${a.studentId}</td><td>${a.student.name}</td><td>${a.roomNo}</td>
                                <td><span class="status status-${a.paymentStatus.toLowerCase().replace(' ', '-')}">${a.paymentStatus}</span></td>
                                <td><button class="btn btn-danger btn-sm delete-student" data-student-id="${a.studentId}">Delete</button><button class="btn btn-secondary btn-sm download-receipt" data-student-id="${a.studentId}">Receipt</button></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
        document.getElementById('create-allotment-form').addEventListener('submit', e => {
            e.preventDefault();
            const studentId = document.getElementById('student-id').value, name = document.getElementById('student-name').value, dept = document.getElementById('student-dept').value, year = parseInt(document.getElementById('student-year').value), roomNo = document.getElementById('room-no').value, paymentStatus = document.getElementById('payment-status').value;
            const data = getData();
            if (data.students.some(s => s.allotmentId === studentId)) { alert(`Error: Student with ID ${studentId} already exists.`); return; }
            const room = data.rooms.find(r => r.roomId === roomNo);
            if (!room) { alert(`Error: Room ${roomNo} not found.`); return; }
            if (room.occupants.length >= room.capacity) { alert(`Error: Room ${roomNo} is full.`); return; }
            const newStudent = { allotmentId: studentId, name, dept, year, photoUrl: `https://i.pravatar.cc/100?u=${studentId}`, roomId: roomNo };
            const newAllotment = { studentId, roomNo, paymentStatus, allottedBy: 'ashif', date: new Date().toISOString().split('T')[0] };
            data.students.push(newStudent);
            data.allotments.push(newAllotment);
            room.occupants.push(studentId);
            saveData(data);
            renderAllotment(container);
            alert('Allotment created successfully!');
            e.target.reset();
        });
        container.querySelectorAll('.delete-student').forEach(button => {
            button.addEventListener('click', e => {
                const studentId = e.target.dataset.studentId;
                if (confirm(`Are you sure you want to DELETE student ${studentId}? This will remove all their records.`)) {
                    let data = getData();
                    const student = data.students.find(s => s.allotmentId === studentId);
                    if (student && student.roomId) {
                        const room = data.rooms.find(r => r.roomId === student.roomId);
                        if (room) { room.occupants = room.occupants.filter(id => id !== studentId); }
                    }
                    data.allotments = data.allotments.filter(a => a.studentId !== studentId);
                    data.students = data.students.filter(s => s.allotmentId !== studentId);
                    saveData(data);
                    renderAllotment(container);
                    alert(`Student ${studentId} has been deleted.`);
                }
            });
        });
        container.querySelectorAll('.download-receipt').forEach(button => {
            button.addEventListener('click', e => {
                const studentId = e.target.dataset.studentId;
                const data = getData();
                const allotment = data.allotments.find(a => a.studentId === studentId);
                const student = data.students.find(s => s.allotmentId === studentId);
                if (allotment && student) { printAllotmentReceipt(allotment, student); }
            });
        });
    }

    function printAllotmentReceipt(allotment, student) {
        const receiptWindow = window.open('', '_blank');
        receiptWindow.document.write(`
            <html><head><title>Allotment Receipt - ${student.allotmentId}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; } .receipt-container { max-width: 800px; margin: 2rem auto; padding: 2rem; border: 1px solid #ccc; box-shadow: 0 0 10px rgba(0,0,0,0.1); position: relative; }
                .receipt-header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 1rem; margin-bottom: 2rem; } .receipt-header h1 { color: #007bff; margin: 0; }
                .student-details { display: flex; align-items: center; margin-bottom: 2rem; } .student-photo { border-radius: 50%; width: 120px; height: 120px; object-fit: cover; margin-right: 2rem; }
                .details-table { width: 100%; } .details-table td { padding: 0.5rem 0; } .details-table td:first-child { font-weight: 600; }
                .footer { text-align: center; margin-top: 3rem; font-size: 0.9rem; color: #888; }
                .paid-stamp { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 5rem; font-weight: 700; color: #28a745; opacity: 0.15; border: 10px solid #28a745; padding: 1rem 2rem; border-radius: 10px; z-index: -1; }
            </style></head><body>
            <div class="receipt-container">
                <div class="receipt-header"><h1>Aliah Hostel</h1><p>Your Home Away From Home</p></div>
                <h2>ROOM ALLOTMENT RECEIPT</h2>
                <div class="student-details"><img src="${student.photoUrl}" alt="Student Photo" class="student-photo"><table class="details-table">
                    <tr><td>Student Name:</td><td>${student.name}</td></tr><tr><td>Student ID:</td><td>${student.allotmentId}</td></tr>
                    <tr><td>Department:</td><td>${student.dept}</td></tr><tr><td>Year:</td><td>${student.year}</td></tr>
                </table></div>
                <div><table class="details-table">
                    <tr><td>Room No:</td><td>${allotment.roomNo}</td></tr><tr><td>Allotment Date:</td><td>${new Date(allotment.date).toLocaleDateString()}</td></tr>
                    <tr><td>Fees Status:</td><td><strong>${allotment.paymentStatus}</strong></td></tr>
                </table></div>
                ${allotment.paymentStatus === 'Paid' ? '<div class="paid-stamp">PAID</div>' : ''}
                <div class="footer"><p>&copy; ${new Date().getFullYear()} Aliah Hostel</p></div>
            </div>
            <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
            </body></html>`);
        receiptWindow.document.close();
    }

    function printRoomChangeRequest(requestId) {
        const data = getData();
        const request = data.roomChangeRequests.find(r => r.requestId === requestId);
        if (!request) return;

        const student = data.students.find(s => s.allotmentId === request.studentId);
        const receiptWindow = window.open('', '_blank');
        receiptWindow.document.write(`
            <html><head><title>Room Change Request - ${request.requestId}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; } 
                .receipt-container { max-width: 800px; margin: 2rem auto; padding: 2rem; border: 1px solid #ccc; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                .receipt-header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 1rem; margin-bottom: 2rem; } 
                .receipt-header h1 { color: #007bff; margin: 0; }
                .details-table { width: 100%; border-collapse: collapse; margin-top: 1rem; } 
                .details-table td { padding: 0.5rem; border-bottom: 1px solid #eee; }
                .details-table td:first-child { font-weight: 600; width: 150px; }
                .footer { text-align: center; margin-top: 3rem; font-size: 0.9rem; color: #888; }
            </style></head><body>
            <div class="receipt-container">
                <div class="receipt-header"><h1>Aliah Hostel</h1><p>Room Change Request</p></div>
                <p><strong>Student:</strong> ${student.name} (${student.allotmentId})</p>
                <p><strong>Request ID:</strong> ${request.requestId}</p>
                <table class="details-table">
                    <tr><td>Date:</td><td>${request.date}</td></tr>
                    <tr><td>Current Room:</td><td>${request.currentRoom}</td></tr>
                    <tr><td>Desired Room:</td><td>${request.desiredRoom}</td></tr>
                    <tr><td>Reason:</td><td>${request.reason}</td></tr>
                    <tr><td>Status:</td><td><strong>${request.status}</strong></td></tr>
                </table>
                <div class="footer"><p>&copy; ${new Date().getFullYear()} Aliah Hostel</p></div>
            </div>
            <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
            </body></html>`);
        receiptWindow.document.close();
    }

    function renderRoomChangeRequests(container) {
        const data = getData();
        container.innerHTML = `
            <h1>Room Change Requests</h1>
            <div class="card table-container">
                <table class="data-table">
                    <thead><tr><th>Student</th><th>Current Room</th><th>Desired Room</th><th>Reason</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${data.roomChangeRequests.map(req => `
                            <tr>
                                <td>${req.studentName} (${req.studentId})</td><td>${req.currentRoom}</td><td>${req.desiredRoom}</td>
                                <td>${req.reason}</td><td>${req.date}</td><td><span class="status status-${req.status.toLowerCase()}">${req.status}</span></td>
                                <td class="action-buttons">
                                    ${req.status === 'Pending' ? `
                                        <button class="btn btn-success btn-sm approve-request" data-request-id="${req.requestId}">Approve</button>
                                        <button class="btn btn-danger btn-sm reject-request" data-request-id="${req.requestId}">Reject</button>
                                        <button class="btn btn-info btn-sm download-request" data-request-id="${req.requestId}">Download</button>
                                    ` : ''}
                                    ${req.status !== 'Pending' ? `
                                        <button class="btn btn-info btn-sm download-request" data-request-id="${req.requestId}">Download</button>
                                    ` : ''}
                                    <button class="btn btn-danger btn-sm delete-request" data-request-id="${req.requestId}">Delete</button>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;

        container.querySelectorAll('.approve-request').forEach(button => {
            button.addEventListener('click', e => {
                const requestId = e.target.dataset.requestId;
                let data = getData();
                const request = data.roomChangeRequests.find(r => r.requestId === requestId);
                if (!request) return;

                const student = data.students.find(s => s.allotmentId === request.studentId);
                const allotment = data.allotments.find(a => a.studentId === request.studentId);
                const oldRoom = data.rooms.find(r => r.roomId === request.currentRoom);
                const newRoom = data.rooms.find(r => r.roomId === request.desiredRoom);

                if (!newRoom) {
                    alert(`Error: Desired room ${request.desiredRoom} does not exist.`);
                    return;
                }
                if (newRoom.occupants.length >= newRoom.capacity) {
                    alert(`Error: Desired room ${request.desiredRoom} is full.`);
                    request.status = 'Rejected';
                    saveData(data);
                    renderRoomChangeRequests(container);
                    return;
                }

                if (oldRoom) {
                    oldRoom.occupants = oldRoom.occupants.filter(id => id !== student.allotmentId);
                }
                newRoom.occupants.push(student.allotmentId);
                student.roomId = newRoom.roomId;
                if (allotment) {
                    allotment.roomNo = newRoom.roomId;
                }
                request.status = 'Approved';

                const newInvoice = {
                    invoiceId: `INV${Date.now()}`,
                    studentId: student.allotmentId,
                    studentName: student.name,
                    description: 'Room Change Fee',
                    amount: 50.00,
                    status: 'Unpaid',
                    date: new Date().toISOString().split('T')[0]
                };
                data.invoices.push(newInvoice);

                saveData(data);
                renderRoomChangeRequests(container);
                alert('Request approved, room change processed, and invoice generated.');
            });
        });

        container.querySelectorAll('.reject-request').forEach(button => {
            button.addEventListener('click', e => {
                const requestId = e.target.dataset.requestId;
                let data = getData();
                const request = data.roomChangeRequests.find(r => r.requestId === requestId);
                if (request) {
                    request.status = 'Rejected';
                    saveData(data);
                    renderRoomChangeRequests(container);
                    alert('Request has been rejected.');
                }
            });
        });

        container.querySelectorAll('.download-request').forEach(button => {
            button.addEventListener('click', e => {
                printRoomChangeRequest(e.target.dataset.requestId);
            });
        });

        container.querySelectorAll('.delete-request').forEach(button => {
            button.addEventListener('click', e => {
                const requestId = e.target.dataset.requestId;
                if (confirm('Are you sure you want to delete this room change request?')) {
                    let data = getData();
                    data.roomChangeRequests = data.roomChangeRequests.filter(r => r.requestId !== requestId);
                    saveData(data);
                    renderRoomChangeRequests(container);
                    alert('Request deleted.');
                }
            });
        });
    }

    function renderInvoices(container) {
    const data = getData();
    container.innerHTML = `
        <h1>Invoices</h1>
        <div class="card table-container">
            <table class="data-table">
                <thead><tr><th>Invoice ID</th><th>Student</th><th>Description</th><th>Amount</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                    ${data.invoices.map(inv => `
                        <tr>
                            <td>${inv.invoiceId}</td><td>${inv.studentName} (${inv.studentId})</td><td>${inv.description}</td>
                            <td>$${inv.amount.toFixed(2)}</td><td>${inv.date}</td><td><span class="status status-${inv.status.toLowerCase()}">${inv.status}</span></td>
                            <td>
                                <button class="btn btn-secondary btn-sm download-invoice" data-invoice-id="${inv.invoiceId}">Download</button>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;

    container.querySelectorAll('.download-invoice').forEach(button => {
        button.addEventListener('click', e => {
            const invoiceId = e.target.dataset.invoiceId;
            const data = getData();
            const invoice = data.invoices.find(inv => inv.invoiceId === invoiceId);
            if (invoice) {
                // Create a dummy fee object to pass to the printFeeReceipt function
                const dummyFee = {
                    feeId: invoice.invoiceId,
                    studentId: invoice.studentId,
                    month: invoice.description,
                    amount: invoice.amount,
                    status: invoice.status,
                };
                printFeeReceipt(dummyFee.feeId, true);
            }
        });
    });
}

    function renderFeeManagement(container) {
        const data = getData();
        container.innerHTML = `
            <h1>Fee Management</h1>
            <div class="card">
                <h3>Generate Monthly Fees</h3>
                <form id="generate-fees-form">
                    <div class="form-group"><label for="fee-month">Month</label><input type="month" id="fee-month" required></div>
                    <div class="form-group"><label for="fee-amount">Amount</label><input type="number" id="fee-amount" value="3000" required></div>
                    <button type="submit" class="btn-primary">Generate Fees</button>
                </form>
            </div>
            <div class="card table-container">
                <h3>Fee Records</h3>
                <table class="data-table">
                    <thead><tr><th>Student</th><th>Month</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${data.monthlyFees.map(fee => `
                            <tr>
                                <td>${fee.studentName} (${fee.studentId})</td><td>${fee.month}</td><td>$${fee.amount.toFixed(2)}</td>
                                <td><span class="status status-${fee.status.toLowerCase()}">${fee.status}</span></td>
                                <td><button class="btn btn-info btn-sm toggle-fee-status" data-fee-id="${fee.feeId}">${fee.status === 'Paid' ? 'Mark as Due' : 'Mark as Paid'}</button></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
        document.getElementById('generate-fees-form').addEventListener('submit', e => {
            e.preventDefault();
            const monthInput = document.getElementById('fee-month').value;
            const amount = parseFloat(document.getElementById('fee-amount').value);
            const [year, month] = monthInput.split('-');
            const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
            const monthStr = `${monthName} ${year}`;
            let data = getData();
            if (data.monthlyFees.some(f => f.month === monthStr)) {
                if (!confirm(`Fees for ${monthStr} already exist. Do you want to generate them again for new students?`)) return;
            }
            const allottedStudentIds = new Set(data.allotments.map(a => a.studentId));
            allottedStudentIds.forEach(studentId => {
                const alreadyExists = data.monthlyFees.some(f => f.studentId === studentId && f.month === monthStr);
                if (!alreadyExists) {
                    const student = data.students.find(s => s.allotmentId === studentId);
                    data.monthlyFees.unshift({
                        feeId: `FEE${Date.now()}${studentId}`,
                        studentId: studentId,
                        studentName: student.name,
                        month: monthStr,
                        amount: amount,
                        status: 'Due',
                        date: new Date().toISOString().split('T')[0]
                    });
                }
            });
            saveData(data);
            renderFeeManagement(container);
            alert(`Fees generated for ${monthStr}.`);
        });
        container.querySelectorAll('.toggle-fee-status').forEach(button => {
            button.addEventListener('click', e => {
                const feeId = e.target.dataset.feeId;
                let data = getData();
                const fee = data.monthlyFees.find(f => f.feeId === feeId);
                if (fee) {
                    fee.status = fee.status === 'Paid' ? 'Due' : 'Paid';
                    saveData(data);
                    renderFeeManagement(container);
                }
            });
        });
    }

    function renderStudentFees(container) {
        const studentId = sessionStorage.getItem('studentLoggedIn');
        const data = getData();
        const studentFees = data.monthlyFees.filter(f => f.studentId === studentId);
        container.innerHTML = `
            <h1>My Fee Status</h1>
            <div class="card table-container">
                <table class="data-table">
                     <thead><tr><th>Month</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                     <tbody>
                        ${studentFees.map(fee => `
                            <tr>
                                <td>${fee.month}</td><td>$${fee.amount.toFixed(2)}</td>
                                <td><span class="status status-${fee.status.toLowerCase()}">${fee.status}</span></td>
                                <td><button class="btn btn-secondary btn-sm download-fee-receipt" data-fee-id="${fee.feeId}">Download Receipt</button></td>
                            </tr>`).join('')}
                     </tbody>
                </table>
            </div>`;
        container.querySelectorAll('.download-fee-receipt').forEach(button => {
            button.addEventListener('click', e => {
                printFeeReceipt(e.target.dataset.feeId);
            });
        });
    }

    function renderStudentRoomRequests(container) {
        const studentId = sessionStorage.getItem('studentLoggedIn');
        const data = getData();
        const studentRequests = data.roomChangeRequests.filter(r => r.studentId === studentId);

        container.innerHTML = `
            <h1>My Room Change Requests</h1>
            <div class="card table-container">
                <table class="data-table">
                     <thead><tr><th>Request ID</th><th>Desired Room</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                     <tbody>
                        ${studentRequests.map(req => `
                            <tr>
                                <td>${req.requestId}</td>
                                <td>${req.desiredRoom}</td>
                                <td>${req.date}</td>
                                <td><span class="status status-${req.status.toLowerCase()}">${req.status}</span></td>
                                <td>
                                    ${req.status === 'Approved' ? `<button class="btn btn-secondary btn-sm download-request" data-request-id="${req.requestId}">Download</button>` : 'N/A'}
                                </td>
                            </tr>
                        `).join('')}
                     </tbody>
                </table>
            </div>`;

        container.querySelectorAll('.download-request').forEach(button => {
            button.addEventListener('click', e => {
                printRoomChangeRequest(e.target.dataset.requestId);
            });
        });
    }

    function printFeeReceipt(id, isInvoice = false) {
        const data = getData();
        let item;
        if (isInvoice) {
            item = data.invoices.find(i => i.invoiceId === id);
        } else {
            item = data.monthlyFees.find(f => f.feeId === id);
        }

        if (!item) return;

        const student = data.students.find(s => s.allotmentId === item.studentId);
        const receiptWindow = window.open('', '_blank');
        receiptWindow.document.write(`
            <html><head><title>Fee Receipt - ${isInvoice ? item.invoiceId : item.month}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; } .receipt-container { max-width: 800px; margin: 2rem auto; padding: 2rem; border: 1px solid #ccc; box-shadow: 0 0 10px rgba(0,0,0,0.1); position: relative; }
                .receipt-header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 1rem; margin-bottom: 2rem; } .receipt-header h1 { color: #007bff; margin: 0; }
                .details-table { width: 100%; border-collapse: collapse; margin-top: 2rem; } .details-table th, .details-table td { padding: 0.8rem; text-align: left; border-bottom: 1px solid #eee; }
                .footer { text-align: center; margin-top: 3rem; font-size: 0.9rem; color: #888; }
                .stamp { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 7rem; font-weight: 700; opacity: 0.15; border: 12px solid; padding: 1rem 2rem; border-radius: 10px; z-index: -1; }
                .stamp-paid { color: #28a745; border-color: #28a745; }
                .stamp-due { color: #dc3545; border-color: #dc3545; }
                .stamp-unpaid { color: #dc3545; border-color: #dc3545; }
            </style></head><body>
            <div class="receipt-container">
                <div class="receipt-header"><h1>Aliah Hostel</h1><p>Fee Receipt</p></div>
                <p><strong>Student:</strong> ${student.name} (${student.allotmentId})</p><p><strong>Receipt ID:</strong> ${isInvoice ? item.invoiceId : item.feeId}</p><p><strong>Date Issued:</strong> ${new Date().toLocaleDateString()}</p>
                <table class="details-table">
                    <thead><tr><th>Description</th><th>Amount</th></tr></thead>
                    <tbody><tr><td>${isInvoice ? item.description : `Hostel Fee for ${item.month}`}</td><td>$${item.amount.toFixed(2)}</td></tr></tbody>
                </table>
                <div class="stamp stamp-${item.status.toLowerCase()}">${item.status}</div>
                <div class="footer"><p>&copy; ${new Date().getFullYear()} Aliah Hostel</p></div>
            </div>
            <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
            </body></html>`);
        receiptWindow.document.close();
    }

    function renderNotices(container) {
        const { notices } = getData();
        container.innerHTML = `
            <h1>Manage Notices</h1>
            <div class="card">
                <h3>Create Notice</h3>
                <form id="notice-form">
                    <div class="form-group"><label for="notice-title">Title</label><input type="text" id="notice-title" required></div>
                    <div class="form-group"><label for="notice-body">Body</label><textarea id="notice-body" rows="4" required></textarea></div>
                    <button type="submit" class="btn-primary">Publish Notice</button>
                </form>
            </div>
            <div class="card table-container">
                <h3>Published Notices</h3>
                <table class="data-table">
                    <thead><tr><th>Title</th><th>Date</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${notices.map(n => `<tr><td>${n.title}</td><td>${n.date}</td><td><button class="btn btn-danger" data-notice-id="${n.noticeId}">Delete</button></td></tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
        document.getElementById('notice-form').addEventListener('submit', e => {
            e.preventDefault();
            const updatedData = getData();
            updatedData.notices.unshift({ noticeId: `N${Date.now()}`, title: document.getElementById('notice-title').value, body: document.getElementById('notice-body').value, date: new Date().toISOString().split('T')[0], stampUrl: 'assets/stamp.png' });
            saveData(updatedData);
            renderNotices(container);
        });
        container.querySelectorAll('.btn-danger').forEach(button => {
            button.addEventListener('click', e => {
                if (confirm('Are you sure you want to delete this notice?')) {
                    const updatedData = getData();
                    updatedData.notices = updatedData.notices.filter(n => n.noticeId !== e.target.dataset.noticeId);
                    saveData(updatedData);
                    renderNotices(container);
                }
            });
        });
    }

    function renderComplaints(container) {
        const { complaints, students } = getData();
        container.innerHTML = `
            <h1>Complaints</h1>
            <div class="card table-container">
                <table class="data-table">
                    <thead><tr><th>ID</th><th>Student</th><th>Room</th><th>Title</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${complaints.map(c => {
                            const student = students.find(s => s.allotmentId === c.fromAllotmentId);
                            return `
                                <tr>
                                    <td>${c.complaintId}</td><td>${student ? student.name : 'N/A'}</td><td>${c.roomId}</td><td>${c.title}</td><td>${c.date}</td>
                                    <td><span class="status status-${c.status.toLowerCase()}">${c.status}</span></td>
                                    <td><button class="btn btn-info" data-complaint-id="${c.complaintId}">View/Update</button></td>
                                </tr>`
                        }).join('')}
                    </tbody>
                </table>
            </div>`;
        container.querySelectorAll('.btn-info').forEach(button => {
            button.addEventListener('click', e => {
                const complaintId = e.target.dataset.complaintId;
                const data = getData();
                const complaint = data.complaints.find(c => c.complaintId === complaintId);
                const newStatus = prompt(`Complaint: ${complaint.title}\nDescription: ${complaint.body}\n\nCurrent Status: ${complaint.status}\nEnter new status (New, In-Progress, Resolved):`, complaint.status);
                if (newStatus && ['New', 'In-Progress', 'Resolved'].includes(newStatus)) {
                    complaint.status = newStatus;
                    if (newStatus === 'Resolved') {
                        complaint.resolutionDate = new Date().toISOString().split('T')[0];
                    }
                    saveData(data);
                    renderComplaints(container);
                }
            });
        });
    }

    // --- LOGIN & LOGOUT ---
    function attachStudentLoginEvents() {
        const loginForm = document.getElementById('student-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', e => {
                e.preventDefault();
                const allotmentId = document.getElementById('student-allotment-id').value;
                const roomNo = document.getElementById('student-room-no').value;
                const errorMessage = loginForm.querySelector('.error-message');
                const { students } = getData();
                const student = students.find(s => s.allotmentId === allotmentId && s.roomId === roomNo);
                if (student) {
                    sessionStorage.setItem('studentLoggedIn', student.allotmentId);
                    window.location.hash = '#student/dashboard';
                } else {
                    errorMessage.textContent = 'Invalid Allotment ID or Password';
                }
            });
        }
    }

    function attachAdminLoginEvents() {
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', e => {
                e.preventDefault();
                const username = document.getElementById('admin-username').value;
                const password = document.getElementById('admin-password').value;
                const errorMessage = loginForm.querySelector('.error-message');
                if (username === 'ashif' && password === 'ashif123') {
                    sessionStorage.setItem('adminLoggedIn', 'true');
                    window.location.hash = '#admin/dashboard';
                } else {
                    errorMessage.textContent = 'Invalid username or password';
                }
            });
        }
    }

    function setupGlobalEventListeners() {
        document.addEventListener('click', e => {
            if (e.target.matches('#admin-logout')) { e.preventDefault(); sessionStorage.removeItem('adminLoggedIn'); window.location.hash = '#home'; }
            if (e.target.matches('#student-logout')) { e.preventDefault(); sessionStorage.removeItem('studentLoggedIn'); window.location.hash = '#home'; }
            if (e.target.matches('#modal-close-btn') || e.target.classList.contains('modal-overlay')) { hideRoomModal(); }
        });
    }

    // --- INITIALIZATION ---
    function init() {
        console.log("Initializing application...");
        initializeData();
        console.log("Data initialized.");
        setupGlobalEventListeners();
        console.log("Global event listeners set up.");
        renderPage('splash-template');
        console.log("Splash screen rendered. Setting timeout for router...");
        setTimeout(() => {
            console.log("Timeout finished. Calling router...");
            router();
            window.addEventListener('hashchange', router);
            console.log("Router called and hashchange listener added.");
        }, 1500);
    }

    try {
        init();
    } catch (error) {
        console.error("Error during application initialization:", error);
        app.innerHTML = '<h1>An error occurred during initialization. Please check the console for details.</h1>';
    }
});