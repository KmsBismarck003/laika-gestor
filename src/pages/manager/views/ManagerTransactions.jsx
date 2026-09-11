import React, { useState, useEffect } from 'react';
import { Card, Table, PermissionWall, Badge } from '../../../components';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { managerAPI } from '../../../services/managerService';

const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatAmount = (value) => {
    const num = Number(value);
    return isNaN(num) ? '—' : `$${num.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
};

const ManagerTransactions = () => {
    const { user } = useAuth();
    const { error: notifyError } = useNotification();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                setLoading(true);
                const data = await managerAPI.getTransactionHistory({ status_filter: 'all' });
                const rows = Array.isArray(data) ? data : (data.purchases || data.items || data.records || []);
                setTransactions(rows);
            } catch (err) {
                console.error('Error fetching transactions:', err);
                notifyError('Error al cargar el historial de transacciones');
                setTransactions([]);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchTransactions();
    }, [user]);

    const columns = [
        { key: 'id', header: 'ID', width: '80px' },
        { key: 'date', header: 'FECHA', render: v => formatDate(v) },
        { key: 'event', header: 'EVENTO', render: (v, row) => row.event_name || row.event || (row.ticket ? row.ticket.event_name : '—') },
        { key: 'amount', header: 'MONTO', render: (v, row) => formatAmount(v ?? row.total_amount ?? row.gross_amount) },
        { key: 'status', header: 'ESTADO', render: (v, row) => {
            const status = v || row.payment_status || row.status || '—';
            const variant = status === 'completed' || status === 'paid' || status === 'confirmed' ? 'success' : status === 'failed' || status === 'cancelled' || status === 'refunded' ? 'error' : 'default';
            return <Badge variant={variant} rounded>{status.toUpperCase()}</Badge>;
        } }
    ];

    return (
        <PermissionWall
            permission="canViewEventAnalytics"
            label="el historial de transacciones"
        >
            <div className="manager-transactions">
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>
                    Historial de Transacciones
                </h2>
                <Card className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <Table
                        columns={columns}
                        data={transactions}
                        loading={loading}
                        emptyMessage="No hay transacciones registradas para tus eventos."
                    />
                </Card>
            </div>
        </PermissionWall>
    );
};

export default ManagerTransactions;