export default function getApiErrorMessage(error, fallback) {
    const responseData = error?.response?.data;

    if (typeof responseData?.error === "string" && responseData.error.trim()) {
        return responseData.error;
    }

    if (typeof responseData?.message === "string" && responseData.message.trim()) {
        return responseData.message;
    }

    if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
        return responseData.errors
            .map(item => item.message || item.error || String(item))
            .join("\n");
    }

    if (!error?.response && error?.request) {
        return "Unable to reach the server. Please check that the backend is running.";
    }

    return fallback || "Something went wrong. Please try again.";
}
