import React, { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { Modal } from '../../components';
import { merchService } from '../../services/merch.service';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './ManagerMerchandise.css';

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

    if (settingsLoading) return <div className="merch-loading">Cargando estado de la tienda...</div>;

    const hasGlobalEnabled = settings?.is_enabled;
    const hasAnyEventEnabled = myEvents.some(ev => ev.merch_enabled);
    const isAllowed = hasGlobalEnabled || hasAnyEventEnabled;

    if (!isAllowed) {
        return (
            <div className="merch-disabled">
                <h3 className="merch-disabled-title">Modulo de Mercancia Desactivado</h3>
                <p>Tu cuenta no tiene habilitada la venta de mercancia o no tienes eventos con esta funcion desbloqueada.</p>
                <p>Por favor contacta al administrador del sistema.</p>
            </div>
        );
    }

    return (
        <div className="merch-page">
            <header className="merch-header">
                <div className="merch-header-group">
                    <button type="button" className="merch-back-btn" onClick={() => navigate(-1)}>
                        VOLVER
                    </button>
                    <h1 className="merch-title">Constructor de Mercancía</h1>
                    <p className="merch-subtitle">Crea y administra los productos oficiales de todos tus eventos en un solo lugar.</p>
                </div>
                <button type="button" className="merch-create-btn" onClick={() => { resetForm(); setShowModal(true); }}>
                    Crear Producto
                </button>
            </header>

            {!settings?.is_enabled && (
                <div className="merch-alert">
                    <h4 className="merch-alert-title">Acceso Parcial por Evento</h4>
                    <p className="merch-alert-text">
                        Tu cuenta no tiene habilitado el modulo de mercancia general, pero el administrador ha desbloqueado esta funcion para eventos especificos. Podrás crear y gestionar productos unicamente para esos eventos autorizados.
                    </p>
                </div>
            )}

            {loading ? (
                <div className="merch-loading">Cargando catalogo...</div>
            ) : merchItems.length === 0 ? (
                <div className="merch-empty">
                    <h3 className="merch-empty-title">No tienes productos en tu catalogo</h3>
                    <p className="merch-empty-text">Empieza agregando tu primer playera, gorra, hoodie o accesorio para tus eventos.</p>
                    <button type="button" className="merch-create-btn merch-create-btn--outline" onClick={() => { resetForm(); setShowModal(true); }}>
                        Crear mi primer producto
                    </button>
                </div>
            ) : (
                <div className="merch-grid">
                    {merchItems.map(item => (
                        <article key={item.id} className="merch-item-card">
                            {item.image_url ? (
                                <div className="merch-item-image" style={{ backgroundImage: `url(${item.image_url.split(',')[0]})` }} />
                            ) : (
                                <div className="merch-item-image merch-item-image--empty">Sin Imagen</div>
                            )}
                            <div className="merch-item-body">
                                <div className="merch-item-tags">
                                    <span className="merch-pill">{item.category || 'General'}</span>
                                    {item.admin_status === 'approved' && <span className="merch-pill merch-pill--approved">Aprobado</span>}
                                    {item.admin_status === 'pending_review' && <span className="merch-pill merch-pill--pending">En Revision</span>}
                                    {item.admin_status === 'rejected' && <span className="merch-pill merch-pill--rejected">Rechazado</span>}
                                </div>

                                <h3 className="merch-item-name">{item.name}</h3>
                                <p className="merch-item-desc">{item.description}</p>

                                <div className="merch-item-event">
                                    <span>Evento:</span>
                                    <strong title={getEventName(item.event_id)}>{getEventName(item.event_id)}</strong>
                                </div>

                                <div className="merch-item-meta">
                                    <div>
                                        <span className="merch-item-meta-label">Precio</span>
                                        <span className="merch-item-price">
                                            ${item.variants && item.variants.length > 0 
                                                ? Math.min(...item.variants.map(v => parseFloat(v.price) || 0)).toFixed(2) 
                                                : '0.00'}
                                        </span>
                                    </div>
                                    <div className="merch-center">
                                        <span className="merch-item-meta-label">Total Stock</span>
                                        <span className="merch-item-stock">
                                            {item.variants ? item.variants.reduce((acc, v) => acc + (v.stock || 0), 0) : 0} pzas
                                        </span>
                                    </div>
                                </div>

                                <div className="merch-item-actions">
                                    <button type="button" className="merch-action-btn" onClick={() => handleEditClick(item)}>Editar</button>
                                    <button type="button" className="merch-action-btn merch-action-btn--danger" onClick={() => handleDeleteClick(item.id)}>Eliminar</button>
                                </div>
                                <button type="button" className="merch-action-btn merch-action-btn--ghost" onClick={() => navigate(`/events/manage/${item.event_id}?tab=merch`)}>
                                    Ir al Evento
                                </button>
                            </div>
                        </article>
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
                title={editingId ? "Editar Mercancia" : "Añadir Mercancia"} 
                size="large"
                className="merch-form-modal"
            >
                <form onSubmit={handleCreateMerch} className="merch-form">
                    <div className="merch-form-grid">
                        <div>
                            <label className="merch-field-label">Seleccionar Evento</label>
                            <select
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
                        <div>
                            <label className="merch-field-label">Nombre del Producto</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="merch-field-label">Descripcion</label>
                        <textarea 
                            rows="2"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            required
                        />
                    </div>

                    <div className="merch-form-grid merch-form-grid--3">
                        <div>
                            <label className="merch-field-label">Categoria</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                placeholder="Ej. Playeras, Gorras"
                                required
                            />
                        </div>
                        <div>
                            <label className="merch-field-label">Precio Base ($)</label>
                            <input
                                type="number" 
                                min="0" 
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({...formData, price: e.target.value})}
                                required={variants.length === 0}
                            />
                        </div>
                        <div>
                            <label className="merch-field-label">Stock Base</label>
                            <input
                                type="number" 
                                min="0"
                                value={formData.stock}
                                onChange={(e) => setFormData({...formData, stock: e.target.value})}
                                required={variants.length === 0}
                            />
                        </div>
                    </div>

                    {/* CONFIGURACIÓN RÁPIDA DE TALLAS */}
                    <div className="merch-box">
                        <h4 className="merch-box-title">Asistente Rapido de Tallas</h4>
                        <p className="merch-box-sub">Activa las tallas disponibles y define el número de unidades en stock para cada una.</p>

                        <div className="merch-size-grid">
                            {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => {
                                const isChecked = variants.some(v => v.attributes && v.attributes.talla && v.attributes.talla.toUpperCase() === size.toUpperCase());
                                const matchedVar = variants.find(v => v.attributes && v.attributes.talla && v.attributes.talla.toUpperCase() === size.toUpperCase());
                                const stockVal = matchedVar ? matchedVar.stock : '';
                                
                                return (
                                    <div key={size} className="merch-size-tile">
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={isChecked} 
                                                onChange={(e) => handleSizeCheckboxChange(size, e.target.checked)}
                                            />
                                            Talla {size}
                                        </label>
                                        {isChecked && (
                                            <div className="merch-tile-stock">
                                                <span className="merch-unit-label">Unidades</span>
                                                <input 
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
                    <div className="merch-box">
                        <h4 className="merch-box-title">Definicion de Opciones (Tallas/Colores/Modelos)</h4>
                        <p className="merch-box-sub">Agrega atributos con sus valores separados por coma.</p>
                        <button
                            type="button"
                            className="merch-chip-btn merch-chip-btn--accent"
                            onClick={handleAddAttributeRow}
                        >
                            Agregar Atributo
                        </button>
                        
                        {formAttributes.map((attr, idx) => (
                            <div key={idx} className="merch-attr-row">
                                <input
                                    type="text"
                                    className="merch-flex-1"
                                    placeholder="Nombre: Ej. talla, color"
                                    value={attr.name}
                                    onChange={(e) => handleAttributeRowChange(idx, 'name', e.target.value)}
                                />
                                <input
                                    type="text"
                                    className="merch-flex-2"
                                    placeholder="Valores: Ej. S, M, L (Separados por coma)"
                                    value={attr.values}
                                    onChange={(e) => handleAttributeRowChange(idx, 'values', e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="merch-row-remove"
                                    onClick={() => handleRemoveAttributeRow(idx)}
                                >
                                    Eliminar
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* DYNAMIC VARIANTS GENERATION AND EDITING */}
                    <div className="merch-box">
                        <div className="merch-variants-header">
                            <div>
                                <h4 className="merch-box-title">Variantes del Producto</h4>
                                <p className="merch-box-sub">Define stock y precio especifico por combinacion de atributos.</p>
                            </div>
                            <div className="merch-variants-actions">
                                <button
                                    type="button"
                                    className="merch-chip-btn merch-chip-btn--accent"
                                    onClick={handleGenerateVariants}
                                >
                                    Generar Variantes
                                </button>
                                <button
                                    type="button"
                                    className="merch-chip-btn"
                                    onClick={handleAddManualVariant}
                                >
                                    Agregar Manual
                                </button>
                            </div>
                        </div>

                        {variants.length > 0 ? (
                            <div className="merch-box-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Atributos</th>
                                            <th>SKU</th>
                                            <th className="merch-col-price">Precio ($)</th>
                                            <th className="merch-col-stock">Stock</th>
                                            <th className="merch-col-action">Accion</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {variants.map((v, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    {v.attributes && Object.keys(v.attributes).length > 0 ? (
                                                        Object.entries(v.attributes).map(([key, val]) => (
                                                            <span key={key} className="merch-variant-attr">
                                                                {key}: <strong>{val || 'sin definir'}</strong>
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="merch-muted">Estandar</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={v.sku}
                                                        onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                                                        className="merch-table-input"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={v.price}
                                                        onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                                                        className="merch-table-input"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={v.stock}
                                                        onChange={(e) => handleVariantChange(idx, 'stock', e.target.value)}
                                                        className="merch-table-input"
                                                    />
                                                </td>
                                                <td className="merch-center">
                                                    <button
                                                        type="button"
                                                        className="merch-row-remove"
                                                        onClick={() => handleRemoveVariant(idx)}
                                                    >
                                                        Eliminar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="merch-box-empty">
                                Sin variantes definidas. Se usara el Precio y Stock Base de arriba.
                            </div>
                        )}
                    </div>

                    <div className="merch-form-grid merch-form-grid--border-top">
                        <div>
                            <label className="merch-field-label">Limite por persona</label>
                            <input
                                type="number" 
                                min="1"
                                value={formData.max_per_person}
                                onChange={(e) => setFormData({...formData, max_per_person: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="merch-field-label">Metodos de Entrega</label>
                            <div className="merch-check-list">
                                <label className="merch-check-label">
                                    <input type="checkbox" checked={formData.delivery_pickup} onChange={(e) => setFormData({...formData, delivery_pickup: e.target.checked})} />
                                    Recoger en Stand del Evento
                                </label>
                                <label className="merch-check-label">
                                    <input type="checkbox" checked={formData.delivery_home} onChange={(e) => setFormData({...formData, delivery_home: e.target.checked})} />
                                    Envio a Domicilio
                                </label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="merch-field-label">Imagen del Producto</label>
                        <div className="merch-tabs">
                            <button
                                type="button"
                                className={`merch-chip-btn ${uploadType === 'file' ? 'merch-chip-btn--active' : ''}`}
                                onClick={() => setUploadType('file')}
                            >
                                Subir Archivo
                            </button>
                            <button
                                type="button"
                                className={`merch-chip-btn ${uploadType === 'url' ? 'merch-chip-btn--active' : ''}`}
                                onClick={() => setUploadType('url')}
                            >
                                Enlace URL
                            </button>
                        </div>
                        {uploadType === 'file' ? (
                            <label 
                                htmlFor="global-merch-file-upload" 
                                className="merch-dropzone"
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    className="hidden"
                                    id="global-merch-file-upload"
                                />
                                <span className="merch-dropzone-title">
                                    {uploading ? 'Subiendo...' : 'Añadir nueva imagen'}
                                </span>
                                <span className="merch-dropzone-hint">Puedes subir multiples imagenes una por una para el carrusel</span>
                            </label>
                        ) : (
                            <div className="merch-url-row">
                                <input
                                    type="url"
                                    id="url-input-temp"
                                    placeholder="https://ejemplo.com/imagen.jpg"
                                />
                                <button type="button" className="merch-chip-btn merch-chip-btn--accent" onClick={() => {
                                    const input = document.getElementById('url-input-temp');
                                    if(input && input.value) {
                                        const currentImages = formData.image_url ? formData.image_url.split(',') : [];
                                        currentImages.push(input.value);
                                        setFormData(prev => ({ ...prev, image_url: currentImages.join(',') }));
                                        input.value = '';
                                    }
                                }}>Añadir</button>
                            </div>
                        )}
                        
                        {formData.image_url && (
                            <div className="merch-thumbs-wrap">
                                <p className="merch-field-label">Imagenes en el carrusel ({formData.image_url.split(',').length})</p>
                                <div className="merch-thumbs">
                                    {formData.image_url.split(',').map((url, idx) => (
                                        <div key={idx} className="merch-thumb">
                                            <img src={url} alt={`Preview ${idx}`} />
                                            <button 
                                                type="button" 
                                                className="merch-thumb-remove"
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

                    <div className="merch-modal-actions">
                        <button
                            type="button"
                            className="merch-modal-cancel"
                            onClick={() => {
                                setShowModal(false);
                                setEditingId(null);
                                resetForm();
                            }}
                        >
                            Cancelar
                        </button>
                        <button type="submit" className="merch-modal-submit" disabled={submitting || uploading}>
                            {submitting ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Enviar a Revision'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ManagerMerchandise;
