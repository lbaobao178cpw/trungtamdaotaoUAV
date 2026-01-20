// Pre-allocated style objects to prevent unnecessary object recreation on every render
// This is a major performance optimization - these are created once and reused everywhere

export const STYLES = {
    // === FLEXBOX LAYOUTS ===
    FLEX_CENTER: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    FLEX_COLUMN: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    FLEX_BETWEEN: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    // === SIZING ===
    FULL_SIZE: {
        width: '100%',
        height: '100%',
    },
    FULL_WIDTH: {
        width: '100%',
    },
    FULL_HEIGHT: {
        height: '100%',
    },

    // === 3D MODEL STYLES ===
    WEBGL_FALLBACK: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(248, 250, 252, 0.95)',
        borderRadius: '8px',
        padding: '30px 40px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        textAlign: 'center',
    },
    WEBGL_ICON: {
        marginBottom: '20px',
        color: '#94a3b8',
    },
    WEBGL_TITLE: {
        margin: '0 0 12px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
    },

    // === LOADING STATES ===
    LOADING_CONTAINER: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 20px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(5px)',
    },
    LOADING_ICON: {
        animation: 'spin 1s linear infinite',
        marginBottom: '10px',
    },
    LOADING_TEXT: {
        fontSize: '14px',
        color: '#0066cc',
        fontWeight: '500',
        marginTop: '10px',
    },

    // === ERROR STATES ===
    ERROR_BOUNDARY_CONTAINER: {
        color: '#d32f2f',
        background: 'rgba(255, 255, 255, 0.98)',
        padding: '30px 40px',
        borderRadius: '12px',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        minWidth: '320px',
        border: '1px solid #fecaca',
        pointerEvents: 'auto',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    ERROR_ICON: {
        marginBottom: '15px',
    },
    ERROR_TITLE: {
        margin: '0 0 8px 0',
        fontSize: '18px',
        fontWeight: 'bold',
    },
    ERROR_TEXT: {
        fontSize: '13px',
        marginTop: '5px',
        color: '#555',
        lineHeight: '1.5',
    },

    // === POINT MARKERS ===
    POINT_MARKER: {
        width: '12px',
        height: '12px',
        background: '#ef4444',
        borderRadius: '50%',
        border: '2px solid white',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    },

    // === MODALS ===
    MODAL_OVERLAY: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    MODAL_CONTENT: {
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        maxHeight: '90vh',
        overflowY: 'auto',
    },

    // === BUTTONS ===
    BUTTON_FULL_WIDTH: {
        width: '100%',
        padding: '10px 16px',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: '500',
        fontSize: '14px',
    },
    BUTTON_PRIMARY: {
        backgroundColor: '#0066cc',
        color: 'white',
    },
    BUTTON_SECONDARY: {
        backgroundColor: '#f1f5f9',
        color: '#1e293b',
        border: '1px solid #cbd5e1',
    },
    BUTTON_DANGER: {
        backgroundColor: '#ef4444',
        color: 'white',
    },

    // === TEXT STYLES ===
    TEXT_SMALL: {
        fontSize: '13px',
    },
    TEXT_MUTED: {
        color: '#64748b',
    },
    TEXT_BOLD: {
        fontWeight: '600',
    },
    TEXT_CENTER: {
        textAlign: 'center',
    },

    // === FORM ELEMENTS ===
    FORM_INPUT: {
        width: '100%',
        padding: '8px 12px',
        borderRadius: '4px',
        border: '1px solid #cbd5e1',
        fontSize: '14px',
        fontFamily: 'inherit',
    },
    FORM_LABEL: {
        display: 'block',
        marginBottom: '4px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#1e293b',
    },

    // === SPACING ===
    SPACER_SM: {
        marginBottom: '8px',
    },
    SPACER_MD: {
        marginBottom: '16px',
    },
    SPACER_LG: {
        marginBottom: '24px',
    },

    // === SHADOWS ===
    SHADOW_SM: {
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    },
    SHADOW_MD: {
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    SHADOW_LG: {
        boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)',
    },
};

// Keyframe animations as strings (to be injected in <style> tags)
export const ANIMATIONS = {
    SPIN: `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,

    FADE_IN: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,

    FADE_OUT: `
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `,

    SLIDE_IN_LEFT: `
    @keyframes slideInLeft {
      from { transform: translateX(-100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `,

    SLIDE_IN_RIGHT: `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `,

    PULSE: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,
};

// Utility hook-like function to merge styles (optional)
export const mergeStyles = (...styles) => {
    return Object.assign({}, ...styles);
};

// Export combined styles for common patterns
export const STYLE_COMBINATIONS = {
    FLEX_CENTER_COLUMN: mergeStyles(STYLES.FLEX_CENTER, STYLES.FLEX_COLUMN),
    FULL_FLEX: mergeStyles(STYLES.FULL_SIZE, STYLES.FLEX_CENTER),
};
