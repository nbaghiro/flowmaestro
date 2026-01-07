import { FlowMaestroWidget } from "@flowmaestro/widget";

// Configuration - update these values
const WIDGET_SLUG = "customer-support-agent-chat"; // Replace with your chat interface slug
const BASE_URL = "https://api.flowmaestro.ai"; // Replace with your FlowMaestro API URL (localhost:3001 for local dev)

// DOM elements
const statusReady = document.getElementById("status-ready")!;
const statusOpen = document.getElementById("status-open")!;
const statusError = document.getElementById("status-error")!;
const btnOpen = document.getElementById("btn-open") as HTMLButtonElement;
const btnClose = document.getElementById("btn-close") as HTMLButtonElement;
const btnToggle = document.getElementById("btn-toggle") as HTMLButtonElement;
const btnDestroy = document.getElementById("btn-destroy") as HTMLButtonElement;
const btnReinit = document.getElementById("btn-reinit") as HTMLButtonElement;

// Widget instance
let widget: FlowMaestroWidget | null = null;

// Update status display
function updateStatus(ready: boolean, open: boolean, error: string | null): void {
    statusReady.textContent = ready ? "true" : "false";
    statusReady.className = `status-value ${ready ? "ready" : "loading"}`;

    statusOpen.textContent = open ? "true" : "false";

    if (error) {
        statusError.textContent = error;
        statusError.className = "status-value error";
    } else {
        statusError.textContent = "none";
        statusError.className = "status-value";
    }
}

// Initialize the widget
async function initWidget(): Promise<void> {
    if (widget) {
        widget.destroy();
    }

    widget = new FlowMaestroWidget({
        slug: WIDGET_SLUG,
        baseUrl: BASE_URL,
        position: "bottom-right",
        initialState: "collapsed",
        onOpen: () => {
            console.log("Widget opened");
            updateStatus(true, true, null);
        },
        onClose: () => {
            console.log("Widget closed");
            updateStatus(true, false, null);
        },
        onReady: () => {
            console.log("Widget ready");
            updateStatus(true, false, null);
            enableButtons();
        },
        onError: (error) => {
            console.error("Widget error:", error);
            updateStatus(false, false, error.message);
        }
    });

    await widget.init();
}

// Enable control buttons
function enableButtons(): void {
    btnOpen.disabled = false;
    btnClose.disabled = false;
    btnToggle.disabled = false;
    btnDestroy.disabled = false;
}

// Disable control buttons
function disableButtons(): void {
    btnOpen.disabled = true;
    btnClose.disabled = true;
    btnToggle.disabled = true;
    btnDestroy.disabled = true;
}

// Set up button event listeners
btnOpen.addEventListener("click", () => {
    widget?.open();
});

btnClose.addEventListener("click", () => {
    widget?.close();
});

btnToggle.addEventListener("click", () => {
    widget?.toggle();
});

btnDestroy.addEventListener("click", () => {
    if (widget) {
        widget.destroy();
        widget = null;
        updateStatus(false, false, null);
        disableButtons();
    }
});

btnReinit.addEventListener("click", () => {
    initWidget();
});

// Initialize on page load
disableButtons();
initWidget().catch((error) => {
    console.error("Failed to initialize widget:", error);
    updateStatus(false, false, error.message);
});
