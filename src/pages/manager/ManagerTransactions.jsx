import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Icon, Input } from '../../components';
import { managerAPI } from '../../services/managerService';
import '../../styles/manager.css';

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
        <Card title="Auditoría de Transacciones">
            <div className="table-actions" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                <Input
                    placeholder="Buscar por ID, Cliente o Evento..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    fullWidth
                />
                <Button variant="outline">
                    <Icon name="download" size={16} className="mr-2" />
                    Exportar CSV
                </Button>
            </div>

            <Table
                columns={columns}
                data={filtered}
                hoverable
                striped
                emptyMessage="No hay transacciones registradas"
            />
        </Card>
    );
};

export default ManagerTransactions;
