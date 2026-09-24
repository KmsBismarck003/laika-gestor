import React, { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { Card, Button, Modal, Input } from '../../components';
import { merchService } from '../../services/merch.service';
import api from '../../services/api';
import { Edit, Plus, Trash, ExternalLink, Info, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../EventManagerDashboard/EventManagerDashboard.css';

const ManagerMerchandise = () => {
    const navigate = useNavigate();
    const { success, error: showError } = useNotification();
    const [merchItems, setMerchItems] = useState([]);
    const [myEvents, setMyEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [settings, setSettings] = useState(null);
    const [settingsLoading, setSettingsLoading] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: '',
        image_url: '',
        event_id: '',
        max_per_person: '5',
        delivery_pickup: true,
        delivery_home: false
    });
    
    // Dynamic attributes state: [{ name: 'talla', values: 'S, M, L' }]
    const [formAttributes, setFormAttributes] = useState([{ name: '', values: '' }]);
    // Dynamic variants state: [{ sku: '', price: '', stock: '', attributes: { talla: 'S' } }]
    const [variants, setVariants] = useState([]);

    const [uploadType, setUploadType] = useState('file');
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        setSettingsLoading(true);
        try {
            const events = await api.manager.getMyEvents();
            setMyEvents(events || []);

            try {
                const sett = await merchService.getSettings(1);
                setSettings(sett);
            } catch (e) {
                console.warn('Could not fetch merch settings', e);
            }

            const items = await merchService.getAllMerchandise(null, null, null, null);
            setMerchItems(items || []);
        } catch (error) {
            console.error('Error fetching manager merch data:', error);
            showError('Error al cargar la informacion de mercancia');
        } finally {
            setLoading(false);
            setSettingsLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const res = await api.manager.uploadImage(file);
            if (res && res.url) {
                const currentImages = formData.image_url ? formData.image_url.split(',') : [];
                currentImages.push(res.url);
                setFormData(prev => ({ ...prev, image_url: currentImages.join(',') }));
                success('Imagen subida correctamente');
            } else {
                showError('Error al subir imagen');
            }
        } catch (err) {
            showError('Error al subir la imagen');
        } finally {
            setUploading(false);
        }
    };

    const generateCartesian = (attributesList) => {
        const filtered = attributesList.filter(a => a.name.trim() && a.values.trim());
        if (filtered.length === 0) return [];
        
        let results = [{}];
        for (const attr of filtered) {
            const nextResults = [];
            const valuesArray = attr.values.split(',').map(v => v.trim()).filter(Boolean);
            for (const res of results) {
                for (const val of valuesArray) {
                    nextResults.push({
                        ...res,
                        [attr.name.toLowerCase().trim()]: val
                    });
                }
            }
            results = nextResults;
        }
        return results;
    };

    const handleGenerateVariants = () => {
        const combinations = generateCartesian(formAttributes);
        if (combinations.length === 0) {
            showError('Por favor define al menos un atributo con valores.');
            return;
        }

        const newVariants = combinations.map((combo, idx) => {
            const comboKeyStr = JSON.stringify(combo);
            const existing = variants.find(v => JSON.stringify(v.attributes) === comboKeyStr);
            
            return {
                id: existing?.id || null,
                sku: existing?.sku || `${formData.name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PROD'}-${Object.values(combo).join('-').toUpperCase().replace(/[^A-Z0-9-]/g, '')}-${Date.now() + idx}`,
                price: existing?.price || formData.price || '0',
                stock: existing?.stock || formData.stock || '0',
                attributes: combo
            };
        });
        setVariants(newVariants);
        success(`Se generaron ${newVariants.length} variantes basadas en las opciones.`);
    };

    const handleAddManualVariant = () => {
        const attrObj = {};
        formAttributes.forEach(a => {
            if (a.name.trim()) {
                attrObj[a.name.toLowerCase().trim()] = '';
            }
        });
        setVariants(prev => [
            ...prev,
            {
                sku: `SKU-${Date.now()}-${prev.length}`,
                price: formData.price || '0',
                stock: formData.stock || '0',
                attributes: attrObj
            }
        ]);
    };

    const handleRemoveVariant = (index) => {
        setVariants(prev => prev.filter((_, i) => i !== index));
    };

    const handleVariantChange = (index, field, value) => {
        setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
    };

    const handleVariantAttrChange = (index, attrName, value) => {
        setVariants(prev => prev.map((v, i) => {
            if (i === index) {
                return {
                    ...v,
                    attributes: {
                        ...v.attributes,
                        [attrName.toLowerCase().trim()]: value
                    }
                };
            }
            return v;
        }));
    };

    const handleAddAttributeRow = () => {
        setFormAttributes(prev => [...prev, { name: '', values: '' }]);
    };

    const handleRemoveAttributeRow = (idx) => {
        setFormAttributes(prev => prev.filter((_, i) => i !== idx));
    };

    const handleAttributeRowChange = (idx, field, value) => {
        setFormAttributes(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    };

    const handleSizeCheckboxChange = (size, checked) => {
        if (!checked) {
            const updatedVariants = variants.filter(v => 
                !(v.attributes && v.attributes.talla && v.attributes.talla.toUpperCase() === size.toUpperCase())
            );
            setVariants(updatedVariants);

            setFormAttributes(prev => {
                const existingTallaIdx = prev.findIndex(a => a.name.toLowerCase().trim() === 'talla');
                if (existingTallaIdx !== -1) {
                    const currentValues = prev[existingTallaIdx].values
                        .split(',')
                        .map(v => v.trim())
                        .filter(Boolean)
                        .filter(v => v.toUpperCase() !== size.toUpperCase());
                    
                    if (currentValues.length === 0) {
                        return prev.filter((_, idx) => idx !== existingTallaIdx);
                    } else {
                        return prev.map((item, idx) => 
                            idx === existingTallaIdx ? { ...item, values: currentValues.join(', ') } : item
                        );
                    }
                }
                return prev;
            });
        } else {
            const cleanName = (formData.name || 'PROD').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PROD';
            const skuVal = `${cleanName}-${size.toUpperCase()}-${Date.now()}`;
            const newVar = {
                id: null,
                sku: skuVal,
                price: formData.price || '0',
                stock: '0',
                attributes: { talla: size }
            };
            const updatedVariants = [...variants, newVar];
            setVariants(updatedVariants);

            setFormAttributes(prev => {
                const existingTallaIdx = prev.findIndex(a => a.name.toLowerCase().trim() === 'talla');
                if (existingTallaIdx !== -1) {
                    const currentValues = prev[existingTallaIdx].values
                        .split(',')
                        .map(v => v.trim())
                        .filter(Boolean);
                    if (!currentValues.some(v => v.toUpperCase() === size.toUpperCase())) {
                        currentValues.push(size);
                    }
                    return prev.map((item, idx) => 
                        idx === existingTallaIdx ? { ...item, values: currentValues.join(', ') } : item
                    );
                } else {
                    if (prev.length === 1 && !prev[0].name.trim()) {
                        return [{ name: 'talla', values: size }];
                    }
                    return [...prev, { name: 'talla', values: size }];
                }
            });
        }
    };

    const handleSizeStockChange = (size, stock) => {
        setVariants(prev => prev.map(v => {
            if (v.attributes && v.attributes.talla && v.attributes.talla.toUpperCase() === size.toUpperCase()) {
                return { ...v, stock: stock };
            }
            return v;
        }));
    };

    const handleCreateMerch = async (e) => {
        e.preventDefault();
        if (submitting) return;

        try {
            if (!formData.event_id) {
                showError('Por favor selecciona un evento.');
                return;
            }

            const selectedEvent = myEvents.find(ev => ev.id === parseInt(formData.event_id));
            const isEventAllowed = selectedEvent?.merch_enabled;
            if (!settings?.is_enabled && !isEventAllowed) {
                showError('La herramienta de mercancia no esta habilitada para este evento.');
                return;
            }

            setSubmitting(true);

            // Parse attributes schema
            let parsedAttributes = null;
            const validAttrs = formAttributes.filter(a => a.name.trim() && a.values.trim());
            if (validAttrs.length > 0) {
                parsedAttributes = {};
                validAttrs.forEach(a => {
                    parsedAttributes[a.name.toLowerCase().trim()] = a.values.split(',').map(v => v.trim()).filter(Boolean);
                });
            }

            // Build variants payload
            let payloadVariants = [];
            if (variants.length > 0) {
                payloadVariants = variants.map(v => ({
                    ...(v.id ? { id: v.id } : {}),
                    sku: v.sku || `SKU-${Date.now()}`,
                    price: parseFloat(v.price) || 0,
                    stock: parseInt(v.stock) || 0,
                    attributes: v.attributes && Object.keys(v.attributes).length > 0 ? v.attributes : null
                }));
            } else {
                payloadVariants = [
                    {
                        sku: `SKU-${Date.now()}`,
                        price: parseFloat(formData.price) || 0,
                        stock: parseInt(formData.stock) || 0,
                        attributes: null
                    }
                ];
            }

            const dMethods = [];
            if (formData.delivery_pickup) dMethods.push('PICKUP_AT_EVENT');
            if (formData.delivery_home) dMethods.push('HOME_DELIVERY');

            const payload = {
                name: formData.name,
                description: formData.description,
                image_url: formData.image_url,
                category: formData.category,
                event_id: parseInt(formData.event_id),
                max_per_person: parseInt(formData.max_per_person) || 5,
                delivery_methods: dMethods,
                attributes_schema: parsedAttributes,
                variants: payloadVariants
            };

            if (editingId) {
                await merchService.updateMerchandise(editingId, payload);
                success('Mercancia actualizada con exito');
            } else {
                await merchService.createMerchandise(payload);
                success('Mercancia enviada para revision');
            }

            setShowModal(false);
            setEditingId(null);
            resetForm();
            loadInitialData();
        } catch (error) {
            console.error(error);
            showError(editingId ? 'Error al actualizar mercancia' : 'Error al crear mercancia');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            price: '',
            stock: '',
            category: '',
            image_url: '',
            event_id: '',
            max_per_person: '5',
            delivery_pickup: true,
            delivery_home: false
        });
        setFormAttributes([{ name: '', values: '' }]);
        setVariants([]);
    };

    const handleEditClick = (item) => {
        setEditingId(item.id);
        
        // Load attributes
        const attrs = [];
        if (item.attributes_schema) {
            Object.entries(item.attributes_schema).forEach(([name, values]) => {
                attrs.push({ name, values: values.join(', ') });
            });
        }
        setFormAttributes(attrs.length > 0 ? attrs : [{ name: '', values: '' }]);

        // Load variants
        const populatedVariants = item.variants ? item.variants.map(v => ({
            id: v.id,
            sku: v.sku,
            price: v.price.toString(),
            stock: v.stock.toString(),
            attributes: v.attributes || {}
        })) : [];
        setVariants(populatedVariants);

        setFormData({
            name: item.name,
            description: item.description,
            price: item.variants?.[0]?.price?.toString() || '',
            stock: item.variants?.[0]?.stock?.toString() || '',
            category: item.category || '',
            image_url: item.image_url || '',
            event_id: item.event_id?.toString() || '',
            max_per_person: item.max_per_person?.toString() || '5',
            delivery_pickup: item.delivery_methods?.includes('PICKUP_AT_EVENT') || false,
            delivery_home: item.delivery_methods?.includes('HOME_DELIVERY') || false
        });
        setUploadType(item.image_url ? 'url' : 'file');
        setShowModal(true);
    };

    const handleDeleteClick = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
        try {
            await merchService.deleteMerchandise(id);
            success('Producto eliminado correctamente');
            loadInitialData();
        } catch (error) {
            showError('Error al eliminar el producto');
        }
    };

    const getEventName = (id) => {
        const ev = myEvents.find(e => e.id === id);
        return ev ? ev.name : `Evento #${id}`;
    };

    if (settingsLoading) return <div className="p-8 text-white">Cargando estado de la tienda...</div>;

    const hasGlobalEnabled = settings?.is_enabled;
    const hasAnyEventEnabled = myEvents.some(ev => ev.merch_enabled);
    const isAllowed = hasGlobalEnabled || hasAnyEventEnabled;

    if (!isAllowed) {
        return (
            <div className="p-8 text-center text-gray-400 border border-dashed border-gray-700 rounded-lg mt-8 bg-gray-900 max-w-2xl mx-auto">
                <h3 className="font-bold text-xl mb-2 text-white">Modulo de Mercancia Desactivado</h3>
                <p className="mb-4">Tu cuenta no tiene habilitada la venta de mercancia o no tienes eventos con esta funcion desbloqueada.</p>
                <p>Por favor contacta al administrador del sistema.</p>
            </div>
        );
    }

    return (
        <div className="bento-dashboard-container">
            <header className="bento-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="bento-welcome-title">Constructor de Mercancía</h1>
                    <p className="bento-date-subtitle">Crea y administra los productos oficiales de todos tus eventos en un solo lugar.</p>
                </div>
                <Button variant="primary" onClick={() => { resetForm(); setShowModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16} /> Crear Producto
                </Button>
            </header>

            {!settings?.is_enabled && (
                <div className="bento-alert bento-alert-info">
                    <Info size={20} style={{ color: '#a855f7', marginTop: '2px', flexShrink: 0 }} />
                    <div>
                        <h4 className="bento-alert-title">Acceso Parcial por Evento</h4>
                        <p className="bento-alert-desc">
                            Tu cuenta no tiene habilitado el módulo de mercancía general, pero el administrador ha desbloqueado esta función para eventos específicos. Podrás crear y gestionar productos únicamente para esos eventos autorizados.
                        </p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="loading-placeholder">Cargando catálogo...</div>
            ) : merchItems.length === 0 ? (
                <div className="bento-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
                    <ShoppingBag size={48} style={{ color: '#a855f7', marginBottom: '1rem' }} />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No tienes productos en tu catálogo</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '400px' }}>Empieza agregando tu primer playera, gorra, hoodie o accesorio para tus eventos.</p>
                    <Button variant="primary" onClick={() => { resetForm(); setShowModal(true); }}>Agregar Producto</Button>
                </div>
            ) : (
                <div className="bento-grid-venues">
                    {merchItems.map(item => (
                        <div key={item.id} className="bento-event-card">
                            {item.image_url ? (
                                <div className="bento-event-cover" style={{ backgroundImage: `url(${item.image_url.split(',')[0]})` }} />
                            ) : (
                                <div className="bento-event-cover-empty">Sin Imagen</div>
                            )}
                            <div className="bento-event-body">
                                <div className="bento-event-tags">
                                    <span className="bento-tag bento-tag-primary">
                                        {item.category || 'General'}
                                    </span>
                                    <div>
                                        {item.admin_status === 'approved' && <span className="bento-tag bento-tag-success">Aprobado</span>}
                                        {item.admin_status === 'pending_review' && <span className="bento-tag bento-tag-warning">En Revisión</span>}
                                        {item.admin_status === 'rejected' && <span className="bento-tag bento-tag-danger">Rechazado</span>}
                                    </div>
                                </div>
                                
                                <h3 className="bento-event-title">{item.name}</h3>
                                <p className="bento-event-desc">{item.description}</p>
                                
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem', background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Evento:</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }} title={getEventName(item.event_id)}>
                                        {getEventName(item.event_id)}
                                    </span>
                                </div>

                                <div className="bento-event-footer bento-event-row">
                                    <div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Precio</span>
                                        <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                                            ${item.variants && item.variants.length > 0 
                                                ? Math.min(...item.variants.map(v => parseFloat(v.price) || 0)).toFixed(2) 
                                                : '0.00'}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Total Stock</span>
                                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {item.variants ? item.variants.reduce((acc, v) => acc + (v.stock || 0), 0) : 0} pzas
                                        </span>
                                    </div>
                                </div>

                                <div className="bento-btn-group">
                                    <Button 
                                        variant="outline" 
                                        size="small" 
                                        onClick={() => handleEditClick(item)}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem' }}
                                    >
                                        <Edit size={12} /> Editar
                                    </Button>
                                    <Button 
                                        variant="danger" 
                                        size="small" 
                                        onClick={() => handleDeleteClick(item.id)}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                    >
                                        <Trash size={12} /> Eliminar
                                    </Button>
                                </div>
                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                                    <Button 
                                        variant="outline" 
                                        size="small" 
                                        fullWidth 
                                        onClick={() => navigate(`/events/manage/${item.event_id}?tab=merch`)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem' }}
                                    >
                                        <ExternalLink size={12} /> Ir al Evento
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal 
                isOpen={showModal} 
                onClose={() => {
                    setShowModal(false);
                    setEditingId(null);
                    resetForm();
                }} 
                title={editingId ? "Editar Mercancía" : "Añadir Mercancía"} 
                size="large"
            >
                <form onSubmit={handleCreateMerch} className="bento-modal-body">
                    <div className="bento-grid-2">
                        <div className="bento-form-group">
                            <label className="bento-label">Seleccionar Evento</label>
                            <select
                                className="bento-select"
                                value={formData.event_id}
                                onChange={(e) => setFormData({...formData, event_id: e.target.value})}
                                required
                            >
                                <option value="">-- Elige un Evento --</option>
                                {myEvents.filter(ev => settings?.is_enabled || ev.merch_enabled).map(ev => (
                                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                                ))}
                            </select>
                        </div>
                        <Input 
                            label="Nombre del Producto"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                            fullWidth
                        />
                    </div>

                    <Input 
                        label="Descripción"
                        textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        required
                        fullWidth
                    />

                    <div className="bento-grid-3">
                        <Input 
                            label="Categoría"
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                            placeholder="Ej. Playeras, Gorras"
                            required
                            fullWidth
                        />
                        <Input 
                            label="Precio Base ($)"
                            type="number" 
                            min="0" 
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData({...formData, price: e.target.value})}
                            required={variants.length === 0}
                            fullWidth
                        />
                        <Input 
                            label="Stock Base"
                            type="number" 
                            min="0"
                            value={formData.stock}
                            onChange={(e) => setFormData({...formData, stock: e.target.value})}
                            required={variants.length === 0}
                            fullWidth
                        />
                    </div>

                    {/* CONFIGURACIÓN RÁPIDA DE TALLAS */}
                    <div className="bento-wizard-container">
                        <div>
                            <h4 className="bento-wizard-title">Asistente Rápido de Tallas</h4>
                            <p className="bento-wizard-subtitle">Activa las tallas disponibles y define el número de unidades en stock para cada una.</p>
                        </div>
                        
                        <div className="bento-wizard-grid">
                            {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => {
                                const isChecked = variants.some(v => v.attributes && v.attributes.talla && v.attributes.talla.toUpperCase() === size.toUpperCase());
                                const matchedVar = variants.find(v => v.attributes && v.attributes.talla && v.attributes.talla.toUpperCase() === size.toUpperCase());
                                const stockVal = matchedVar ? matchedVar.stock : '';
                                
                                return (
                                    <div key={size} className={`bento-wizard-card ${isChecked ? 'active' : ''}`}>
                                        <label className="bento-wizard-label">
                                            <input 
                                                type="checkbox" 
                                                checked={isChecked} 
                                                onChange={(e) => handleSizeCheckboxChange(size, e.target.checked)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            Talla {size}
                                        </label>
                                        {isChecked && (
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Unidades</span>
                                                <input 
                                                    className="bento-input"
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', minHeight: 'auto' }}
                                                    type="number"
                                                    min="0"
                                                    placeholder="Ej. 10"
                                                    value={stockVal}
                                                    onChange={(e) => handleSizeStockChange(size, e.target.value)}
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* DYNAMIC ATTRIBUTED CONFIGURATION */}
                    <div className="bento-wizard-container">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 className="bento-wizard-title">Definición de Opciones (Tallas/Colores/Modelos)</h4>
                            <Button
                                variant="outline"
                                size="small"
                                onClick={handleAddAttributeRow}
                            >
                                + Agregar Atributo
                            </Button>
                        </div>
                        
                        {formAttributes.map((attr, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    className="bento-input"
                                    style={{ flex: 1 }}
                                    placeholder="Nombre: Ej. talla, color"
                                    value={attr.name}
                                    onChange={(e) => handleAttributeRowChange(idx, 'name', e.target.value)}
                                />
                                <input
                                    type="text"
                                    className="bento-input"
                                    style={{ flex: 2 }}
                                    placeholder="Valores: Ej. S, M, L (Separados por coma)"
                                    value={attr.values}
                                    onChange={(e) => handleAttributeRowChange(idx, 'values', e.target.value)}
                                />
                                <Button
                                    variant="danger"
                                    size="small"
                                    onClick={() => handleRemoveAttributeRow(idx)}
                                >
                                    <Trash size={16} />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* DYNAMIC VARIANTS GENERATION AND EDITING */}
                    <div className="bento-wizard-container">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <h4 className="bento-wizard-title">Variantes del Producto</h4>
                                <p className="bento-wizard-subtitle">Define stock y precio específico por combinación de atributos.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <Button
                                    variant="primary"
                                    size="small"
                                    onClick={handleGenerateVariants}
                                >
                                    Generar Variantes
                                </Button>
                                <Button
                                    variant="outline"
                                    size="small"
                                    onClick={handleAddManualVariant}
                                >
                                    Agregar Manual
                                </Button>
                            </div>
                        </div>

                        {variants.length > 0 ? (
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', maxHeight: '250px', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
                                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem' }}>Atributos</th>
                                            <th style={{ padding: '0.75rem' }}>SKU</th>
                                            <th style={{ padding: '0.75rem', width: '100px' }}>Precio ($)</th>
                                            <th style={{ padding: '0.75rem', width: '100px' }}>Stock</th>
                                            <th style={{ padding: '0.75rem', width: '60px', textAlign: 'center' }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {variants.map((v, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.75rem' }}>
                                                    {v.attributes && Object.keys(v.attributes).length > 0 ? (
                                                        Object.entries(v.attributes).map(([key, val]) => (
                                                            <span key={key} className="bento-tag bento-tag-primary" style={{ marginRight: '4px', display: 'inline-block', marginBottom: '2px' }}>
                                                                {key}: <strong>{val || 'sin definir'}</strong>
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)' }}>Estándar</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.5rem' }}>
                                                    <input
                                                        type="text"
                                                        value={v.sku}
                                                        onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                                                        className="bento-input"
                                                        style={{ padding: '0.25rem 0.5rem', minHeight: 'auto', fontSize: '0.8rem', fontFamily: 'monospace' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '0.5rem' }}>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={v.price}
                                                        onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                                                        className="bento-input"
                                                        style={{ padding: '0.25rem 0.5rem', minHeight: 'auto', fontSize: '0.8rem' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '0.5rem' }}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={v.stock}
                                                        onChange={(e) => handleVariantChange(idx, 'stock', e.target.value)}
                                                        className="bento-input"
                                                        style={{ padding: '0.25rem 0.5rem', minHeight: 'auto', fontSize: '0.8rem' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveVariant(idx)}
                                                        style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                                                    >
                                                        <Trash size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="loading-placeholder" style={{ padding: '1.5rem', fontSize: '0.8rem' }}>
                                Sin variantes definidas. Se usará el Precio y Stock Base de arriba.
                            </div>
                        )}
                    </div>

                    <div className="bento-grid-2" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                        <Input 
                            label="Límite por persona"
                            type="number" 
                            min="1"
                            value={formData.max_per_person}
                            onChange={(e) => setFormData({...formData, max_per_person: e.target.value})}
                            fullWidth
                        />
                        <div className="bento-form-group">
                            <label className="bento-label">Métodos de Entrega</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                    <input type="checkbox" checked={formData.delivery_pickup} onChange={(e) => setFormData({...formData, delivery_pickup: e.target.checked})} />
                                    Recoger en Stand del Evento
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                    <input type="checkbox" checked={formData.delivery_home} onChange={(e) => setFormData({...formData, delivery_home: e.target.checked})} />
                                    Envío a Domicilio
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="bento-form-group">
                        <label className="bento-label">Imagen del Producto</label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <Button
                                variant={uploadType === 'file' ? 'primary' : 'outline'}
                                size="small"
                                onClick={() => setUploadType('file')}
                            >
                                Subir Archivo
                            </Button>
                            <Button
                                variant={uploadType === 'url' ? 'primary' : 'outline'}
                                size="small"
                                onClick={() => setUploadType('url')}
                            >
                                Enlace URL
                            </Button>
                        </div>
                        {uploadType === 'file' ? (
                            <label 
                                htmlFor="global-merch-file-upload" 
                                style={{ display: 'block', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', background: 'var(--bg-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 }}
                                    id="global-merch-file-upload"
                                />
                                <span style={{ display: 'block', color: '#a855f7', fontWeight: 700, marginBottom: '0.25rem' }}>
                                    {uploading ? 'Subiendo...' : 'Añadir nueva imagen'}
                                </span>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Puedes subir múltiples imágenes una por una para el carrusel</span>
                            </label>
                        ) : (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="url"
                                    id="url-input-temp"
                                    placeholder="https://ejemplo.com/imagen.jpg"
                                    className="bento-input"
                                />
                                <Button type="button" onClick={() => {
                                    const input = document.getElementById('url-input-temp');
                                    if(input && input.value) {
                                        const currentImages = formData.image_url ? formData.image_url.split(',') : [];
                                        currentImages.push(input.value);
                                        setFormData(prev => ({ ...prev, image_url: currentImages.join(',') }));
                                        input.value = '';
                                    }
                                }}>Añadir</Button>
                            </div>
                        )}
                        
                        {formData.image_url && (
                            <div style={{ marginTop: '1rem' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Imágenes en el carrusel ({formData.image_url.split(',').length})</p>
                                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                                    {formData.image_url.split(',').map((url, idx) => (
                                        <div key={idx} style={{ position: 'relative', flexShrink: 0, border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px', background: 'var(--bg-tertiary)' }}>
                                            <img src={url} alt={`Preview ${idx}`} style={{ height: '64px', width: '64px', objectFit: 'cover', borderRadius: '4px' }} />
                                            <button 
                                                type="button" 
                                                style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    const imgs = formData.image_url.split(',');
                                                    imgs.splice(idx, 1);
                                                    setFormData(prev => ({...prev, image_url: imgs.join(',')}));
                                                }}
                                            >×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => {
                                setShowModal(false);
                                setEditingId(null);
                                resetForm();
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" disabled={submitting || uploading}>
                            {submitting ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Enviar a Revisión'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ManagerMerchandise;
