// =============================================================================
// 전역 변수
// =============================================================================
let subscribers = [];
let currentDevices = [];
let selectedUserId = null;
let selectedDeviceId = null;
let usageChart = null;


// =============================================================================
// [요구사항 #3] 상태 기반 Badge 스타일
// =============================================================================
function badgeClass(value) {
    const v = (value || "").toLowerCase();

    if (["active", "online", "normal"].includes(v)) {
        return "badge status-active";
    }

    if (["paused", "standby"].includes(v)) {
        return "badge status-paused";
    }

    if (["expired", "error", "warning"].includes(v)) {
        return "badge status-expired";
    }

    if (v === "offline") {
        return "badge status-offline";
    }

    if (["on", "cleaning"].includes(v)) {
        return "badge status-on";
    }

    if (v === "off") {
        return "badge status-off";
    }

    return "badge";
}


// =============================================================================
// [요구사항 #1] 구독 사용자 조회 + 검색/필터
// =============================================================================

// TODO [요구사항 #1-A]: GET /api/subscribers 를 호출하여
// subscribers 변수에 저장하고 renderSubscribers()를 호출하세요.
async function fetchSubscribers() {
    try {
        // 1. GET /api/subscribers 호출
        const response = await fetch("/api/subscribers");

        if (!response.ok) {
            throw new Error(`HTTP 에러! 상태 코드: ${response.status}`);
        }

        // 2. 응답을 subscribers 변수에 저장
        const data = await response.json();
        subscribers = data;

        // 3. renderSubscribers() 호출
        renderSubscribers();

    } catch (error) {
        console.error("구독 사용자 목록을 불러오지 못했습니다:", error);
    }
}


// TODO [요구사항 #1-B]: subscribers 배열을 테이블에 렌더링하세요.
function renderSubscribers() {
    const tbody = document.getElementById("subscriber-body");
    const search = document
        .getElementById("subscriber-search")
        .value
        .toLowerCase();

    const statusFilter =
        document.getElementById("subscriber-status-filter").value;

    // 검색 + 상태 필터
    const filteredSubscribers = subscribers.filter(subscriber => {
        const matchesSearch =
            String(subscriber.name || "").toLowerCase().includes(search) ||
            String(subscriber.plan || "").toLowerCase().includes(search) ||
            String(subscriber.status || "").toLowerCase().includes(search) ||
            String(subscriber.userId || "").toLowerCase().includes(search);

        const matchesStatus =
            statusFilter === "" ||
            subscriber.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // 기존 테이블 초기화
    tbody.innerHTML = "";

    // 필터 결과 렌더링
    filteredSubscribers.forEach(subscriber => {
        const tr = document.createElement("tr");

        // 현재 선택된 사용자 표시
        if (subscriber.userId === selectedUserId) {
            tr.classList.add("selected");
        }

        // 행 클릭 시 사용자 선택
        tr.addEventListener("click", () => {
            selectSubscriber(subscriber.userId);
        });

        tr.innerHTML = `
            <td>${subscriber.userId}</td>
            <td>${subscriber.name}</td>
            <td>${subscriber.plan}</td>
            <td>
                <span class="${badgeClass(subscriber.status)}">
                    ${subscriber.status}
                </span>
            </td>
            <td>${subscriber.deviceCount}</td>
        `;

        tbody.appendChild(tr);
    });
}


// =============================================================================
// [요구사항 #2] 사용자별 가전 목록 + 사용 현황 + 차트
// =============================================================================

// TODO [요구사항 #2-A]: 사용자 클릭 시 해당 사용자의 가전 목록을 조회하세요.
async function selectSubscriber(userId) {
    // 1. selectedUserId 업데이트, selectedDeviceId 초기화
    selectedUserId = userId;
    selectedDeviceId = null;

    // 2. 사용자 테이블 선택 상태 반영
    renderSubscribers();

    // 3. 이전 사용 현황 초기화
    const usageEmpty = document.getElementById("usage-empty");
    const usageDetail = document.getElementById("usage-detail");
    const usageInfo = document.getElementById("usage-info");

    usageEmpty.style.display = "";
    usageDetail.style.display = "none";
    usageInfo.innerHTML = "";

    // 기존 차트 제거
    if (usageChart) {
        usageChart.destroy();
        usageChart = null;
    }

    try {
        // 4. GET /api/subscribers/{userId}/devices 호출
        const response =
            await fetch(`/api/subscribers/${userId}/devices`);

        if (!response.ok) {
            throw new Error(`HTTP 에러! 상태 코드: ${response.status}`);
        }

        // 5. currentDevices 저장
        const data = await response.json();
        currentDevices = data;

    } catch (error) {
        console.error("가전 목록을 불러오지 못했습니다:", error);

        currentDevices = [];
    }

    // 6. renderDevices() 호출
    renderDevices();
}


// TODO [요구사항 #2-B]: currentDevices 배열을 테이블에 렌더링하세요.
function renderDevices() {
    const emptyEl = document.getElementById("device-empty");
    const tableEl = document.getElementById("device-table");
    const tbody = document.getElementById("device-body");

    const search = document
        .getElementById("device-search")
        .value
        .toLowerCase();

    const statusFilter =
        document.getElementById("device-status-filter").value;

    // 검색 + 상태 필터
    const filteredDevices = currentDevices.filter(device => {
        const matchesSearch =
            String(device.type || "").toLowerCase().includes(search) ||
            String(device.model || "").toLowerCase().includes(search) ||
            String(device.status || "").toLowerCase().includes(search) ||
            String(device.deviceId || "").toLowerCase().includes(search) ||
            String(device.location || "").toLowerCase().includes(search);

        const matchesStatus =
            statusFilter === "" ||
            device.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    tbody.innerHTML = "";

    // 등록된 가전 자체가 없음
    if (currentDevices.length === 0) {
        emptyEl.textContent = "No registered devices";
        emptyEl.style.display = "";
        tableEl.style.display = "none";
        return;
    }

    // 검색/필터 결과가 없음
    if (filteredDevices.length === 0) {
        emptyEl.textContent = "No devices matched";
        emptyEl.style.display = "";
        tableEl.style.display = "none";
        return;
    }

    // 결과 있음
    emptyEl.style.display = "none";
    tableEl.style.display = "";

    filteredDevices.forEach(device => {
        const tr = document.createElement("tr");

        // 현재 선택된 가전 표시
        if (device.deviceId === selectedDeviceId) {
            tr.classList.add("selected");
        }

        // 행 클릭 시 가전 선택
        tr.addEventListener("click", () => {
            selectDevice(device.deviceId);
        });

        tr.innerHTML = `
            <td>${device.deviceId}</td>
            <td>${device.type}</td>
            <td>${device.model}</td>
            <td>${device.location}</td>
            <td>
                <span class="${badgeClass(device.status)}">
                    ${device.status}
                </span>
            </td>
        `;

        tbody.appendChild(tr);
    });
}


// TODO [요구사항 #2-C]: 가전 클릭 시 상세 사용 현황을 조회하세요.
async function selectDevice(deviceId) {
    // 1. selectedDeviceId 업데이트
    selectedDeviceId = deviceId;

    // 2. 선택 상태 반영
    renderDevices();

    try {
        // 3. GET /api/devices/{deviceId}/usage 호출
        const response =
            await fetch(`/api/devices/${deviceId}/usage`);

        if (!response.ok) {
            throw new Error(`HTTP 에러! 상태 코드: ${response.status}`);
        }

        const data = await response.json();

        const usageEmpty = document.getElementById("usage-empty");
        const usageDetail = document.getElementById("usage-detail");
        const usageInfo = document.getElementById("usage-info");

        // 4. usage-empty 숨기기, usage-detail 표시
        usageEmpty.style.display = "none";
        usageDetail.style.display = "";

        // 5. 상세 정보 렌더링
        usageInfo.innerHTML = `
            <div>
                <strong>Device ID:</strong>
                ${data.deviceId}
            </div>

            <div>
                <strong>Device Name:</strong>
                ${data.deviceName}
            </div>

            <div>
                <strong>Power Status:</strong>
                <span class="${badgeClass(data.powerStatus)}">
                    ${data.powerStatus}
                </span>
            </div>

            <div>
                <strong>Last Used:</strong>
                ${data.lastUsedAt}
            </div>

            <div>
                <strong>Total Usage Hours:</strong>
                ${data.totalUsageHours}
            </div>

            <div>
                <strong>Weekly Usage Count:</strong>
                ${data.weeklyUsageCount}
            </div>

            <div>
                <strong>Health Status:</strong>
                <span class="${badgeClass(data.healthStatus)}">
                    ${data.healthStatus}
                </span>
            </div>

            <div>
                <strong>Remark:</strong>
                ${data.remark || ""}
            </div>
        `;

        // 6. 주간 사용량 차트
        renderUsageChart(data.weeklyUsageTrend);

    } catch (error) {
        console.error("사용 현황을 불러오지 못했습니다:", error);
    }
}


// TODO [요구사항 #2-D]: Chart.js를 사용하여 주간 사용량 Bar Chart를 그리세요.
function renderUsageChart(trend) {
    const ctx = document.getElementById("usageChart");

    // 1. 기존 차트 있으면 destroy()
    if (usageChart) {
        usageChart.destroy();
    }

    // 2. 새 차트 생성
    usageChart = new Chart(ctx, {
        type: "bar",

        data: {
            labels: [
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
                "Sun"
            ],

            datasets: [
                {
                    label: "Usage",
                    data: trend
                }
            ]
        },

        options: {
            responsive: true,

            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}


// =============================================================================
// 이벤트 바인딩 + 초기화
// =============================================================================
function bindEvents() {
    // [요구사항 #1]
    document
        .getElementById("subscriber-search")
        .addEventListener("input", renderSubscribers);

    document
        .getElementById("subscriber-status-filter")
        .addEventListener("change", renderSubscribers);

    // [요구사항 #2]
    document
        .getElementById("device-search")
        .addEventListener("input", renderDevices);

    document
        .getElementById("device-status-filter")
        .addEventListener("change", renderDevices);
}


// 이벤트 바인딩
bindEvents();

// 최초 구독자 목록 조회
fetchSubscribers();