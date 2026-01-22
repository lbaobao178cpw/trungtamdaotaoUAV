import { toast } from 'react-toastify';

// Filter localhost URLs from error messages
const filterErrorMessage = (message) => {
    if (!message) return message;
    const regex = /http:\/\/localhost:\d+\/api\/\S+\s+\d+\s+/gi;
    return message.replace(regex, '').trim();
};

// Success notification - Green toast, 2.5s
export const notifySuccess = (message) => {
    toast.success(message, {
        position: "top-right",
        autoClose: 2500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
    });
};

// Error notification - Red toast, 3s, auto-filter localhost URLs
export const notifyError = (message) => {
    const cleanMessage = filterErrorMessage(message);
    toast.error(cleanMessage, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
    });
};

// Warning notification - Yellow toast, 2.5s
export const notifyWarning = (message) => {
    toast.warning(message, {
        position: "top-right",
        autoClose: 2500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
    });
};

// Info notification - Blue toast, 2.5s
export const notifyInfo = (message) => {
    toast.info(message, {
        position: "top-right",
        autoClose: 2500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
    });
};

// Advanced: Show loading toast and update it
export const notifyLoading = (message) => {
    return toast.loading(message, {
        position: "top-right",
    });
};

// Advanced: Update loading toast to success
export const updateToastSuccess = (toastId, message) => {
    toast.update(toastId, {
        render: message,
        type: "success",
        isLoading: false,
        autoClose: 2500,
    });
};

// Advanced: Update loading toast to error
export const updateToastError = (toastId, message) => {
    const cleanMessage = filterErrorMessage(message);
    toast.update(toastId, {
        render: cleanMessage,
        type: "error",
        isLoading: false,
        autoClose: 3000,
    });
};
