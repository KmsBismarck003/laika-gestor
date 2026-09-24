import React, { useState, useEffect } from 'react';
import { Table, Button, Icon, Input } from '../../components';
import { managerAPI } from '../../services/managerService';
import '../EventManagerDashboard/EventManagerDashboard.css';

const ManagerTransactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true);
            try {
                const response = await managerAPI.getTransactionHistory?.() || [];
                setTransactions(Array.isArray(response) ? response : []);
            } catch (error) {
                console.error('Error fetching transactions:', error);
                setTransactions([]);
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, []);

    const columns = [
        { key: 'user_id', header: 'ID Usuario' },
        { key: 'total_tickets', header: 'Total Boletos' },
        {
            key: 'last_purchase',
            header: 'Última Compra',
            render: (val) => val ? new Date(val).toLocaleString() : 'N/A'
        }
    ];

    const filtered = transactions.filter(t => {
        const id = String(t?.user_id || '').toLowerCase();
        const total = String(t?.total_tickets || '').toLowerCase();
        const searchLower = search.toLowerCase();

        return id.includes(searchLower) || total.includes(searchLower);
    });

    return (
        <div className="bento-dashboard-container">
            {/* Header */}
            <header className="bento-header">
                <h1 className="bento-welcome-title">Control de Ventas</h1>
                <p className="bento-date-subtitle">Auditoría de Transacciones</p>
            </header>

            <div className="bento-card" style={{ padding: '2rem' }}>
                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <Input
                            placeholder="Buscar por ID, Cliente o Evento..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            fullWidth
                            style={{ 
                                background: 'var(--bg-tertiary)', 
                                border: '1px solid var(--border-color)', 
                                color: 'var(--text-primary)',
                                borderRadius: '12px'
                            }}
                        />
                    </div>
                    <Button variant="outline" style={{ borderRadius: '12px' }}>
                        <Icon name="download" size={16} style={{ marginRight: '8px' }} />
                        Exportar CSV
                    </Button>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
                    <Table
                        columns={columns}
                        data={filtered}
                        hoverable
                        striped
                        emptyMessage="No hay transacciones registradas"
                    />
                </div>
            </div>
        </div>
    );
};

export default ManagerTransactions;
