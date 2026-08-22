import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
let token = '';
async function api(path, init = {}) { const response = await fetch(path, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...init.headers }, credentials: 'include' }), body = await response.json(); if (!response.ok)
    throw new Error(body.message ?? 'Request failed'); return body.data; }
function App() { const [staff, setStaff] = useState(), [reports, setReports] = useState([]), [users, setUsers] = useState([]), [error, setError] = useState(''), [input, setInput] = useState(token); const load = async () => { try {
    const me = await api('/api/admin-secure/me');
    setStaff(me);
    if (me.permissions.includes('reports.read'))
        setReports((await api('/api/admin-secure/reports')).items);
    if (me.permissions.includes('users.read_basic'))
        setUsers((await api('/api/admin-secure/users')).items);
}
catch (e) {
    token = '';
    setError(e instanceof Error ? e.message : 'Access denied');
} }; useEffect(() => { if (token)
    void load(); }, []); if (!staff)
    return _jsxs("main", { className: "login", children: [_jsx("h1", { children: "InstaFrame Staff" }), _jsx("p", { children: "Separate, MFA-protected moderation console. Enter a short-lived token; it remains in memory only." }), _jsx("input", { type: "password", value: input, onChange: e => setInput(e.target.value), placeholder: "Admin access token", autoComplete: "off" }), _jsx("button", { onClick: () => { token = input; setInput(''); void load(); }, children: "Continue" }), error && _jsx("b", { children: error })] }); return _jsxs("div", { className: "shell", children: [_jsxs("aside", { children: [_jsx("h2", { children: "IF Staff" }), _jsx("strong", { children: staff.staff.displayName }), _jsx("small", { children: staff.staff.staffRole.replaceAll('_', ' ') }), _jsx("button", { onClick: () => { token = ''; location.reload(); }, children: "Sign out" })] }), _jsxs("main", { children: [_jsxs("header", { children: [_jsx("p", { children: "SECURE MODERATION" }), _jsx("h1", { children: "Safety operations" })] }), _jsxs("section", { className: "stats", children: [_jsxs("article", { children: [_jsx("b", { children: reports.length }), _jsx("span", { children: "Open reports" })] }), _jsxs("article", { children: [_jsx("b", { children: users.filter(x => x.status === 'suspended').length }), _jsx("span", { children: "Suspended" })] }), _jsxs("article", { children: [_jsx("b", { children: staff.permissions.length }), _jsx("span", { children: "Granted permissions" })] })] }), staff.permissions.includes('reports.read') && _jsxs("section", { children: [_jsx("h2", { children: "Report queue" }), reports.map(x => _jsxs("article", { className: "row", children: [_jsx("b", { children: x.reason }), _jsx("span", { children: x.targetType }), _jsx("small", { children: new Date(x.createdAt).toLocaleString() })] }, x._id))] }), staff.permissions.includes('users.read_basic') && _jsxs("section", { children: [_jsx("h2", { children: "User directory" }), users.map(x => _jsxs("article", { className: "row", children: [_jsxs("b", { children: [x.name, " \u00B7 @", x.username] }), _jsx("span", { children: x.status })] }, x._id))] })] })] }); }
;
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(App, {}) }));
