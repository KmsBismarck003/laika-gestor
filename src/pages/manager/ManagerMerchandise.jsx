import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { Modal } from '../../components';
import { merchService } from '../../services/merch.service';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../../utils/imageUtils';
import {
    ArrowLeft,
    Plus,
    Search,
    Calendar,
    Tag,
    ShoppingBag,
    Package,
    Layers,
    Edit,
    Trash2,
    ExternalLink,
    AlertCircle,
    CheckCircle2,
    Clock,
    X,
    UploadCloud,
    Link as LinkIcon,
    Sparkles,
    RotateCcw
} from 'lucide-react';
import './ManagerMerchandise.css';

const QUICK_CATEGORIES = [
    'Ropa',
    'Vasos y Termos',
    'Accesorios',
    'Souvenirs',
    'Coleccionables'
];

/**
 * Image component with safe fallback and no raw broken alt text bleeding
 */
const MerchCardImage = ({ src, alt, category }) => {
    const [imgError, setImgError] = useState(false);
    const [prevSrc, setPrevSrc] = useState(src);

    if (prevSrc !== src) {
        setPrevSrc(src);
        setImgError(false);
    }

    const resolvedUrl = src ? getImageUrl(src) : null;

    if (!resolvedUrl || imgError) {
        return (
            <div className="merch-card-fallback">
                <div className="merch-fallback-icon-wrap">
                    <ShoppingBag size={32} />
                </div>
                <span className="merch-fallback-label">{category || 'Artículo Oficial'}</span>
            </div>
        );
    }

    return (
        <img
            src={resolvedUrl}
            alt={alt || 'Producto'}
            className="merch-card-img"
            onError={() => setImgError(true)}
            loading="lazy"
        />
    );
};

const ManagerMerchandise = () => {
    const navigate = useNavigate();
    const { success, error: showError } = useNotification();
    const [merchItems, setMerchItems] = useState([]);
    const [myEvents, setMyEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [settings, setSettings] = useState(null);
    const [settingsLoading, setSettingsLoading] = useState(true);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEvent, setFilterEvent] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

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

    const loadInitialData = useCallback(async () => {
        setLoading(true);
        setSettingsLoading(true);
        try {
            const events = await api.manager.getMyEvents();
            setMyEvents(events || []);

            try {
                const sett = await merchService.getSettings(1);
                setSettings(sett);
            } catch (e) {
                console.warn('Could not fetch merch settings, defaulting to enabled', e);
                setSettings({ is_enabled: true, isEnabled: true });
            }

            const items = await merchService.getAllMerchandise(null, null, null, null);
            setMerchItems(items || []);
        } catch (error) {
            console.error('Error fetching manager merch data:', error);
            showError('Error al cargar la información de mercancía');
        } finally {
            setLoading(false);
            setSettingsLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            if (isMounted) {
                await loadInitialData();
            }
        };
        init();
        return () => { isMounted = false; };
    }, [loadInitialData]);

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
        } catch {
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
                sku: existing?.sku || `${(formData.name || 'PROD').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PROD'}-${Object.values(combo).join('-').toUpperCase().replace(/[^A-Z0-9-]/g, '')}-${Date.now() + idx}`,
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
            const skuVal = `${cleanName}-${size.toUpperCase()}-${variants.length + 1}`;
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

    const handleCreateMerch = async (e) => {
        e.preventDefault();
        if (submitting) return;

        try {
            if (!formData.event_id) {
                showError('Por favor selecciona un evento.');
                return;
            }

            const selectedEvent = myEvents.find(ev => String(ev.id) === String(formData.event_id));
            const isEventAllowed = selectedEvent?.merch_enabled;
            const isGlobalAllowed = settings?.is_enabled || settings?.isEnabled;
            if (!isGlobalAllowed && !isEventAllowed) {
                showError('La herramienta de mercancía no está habilitada para este evento.');
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
                    stock: parseInt(v.stock, 10) || 0,
                    attributes: v.attributes && Object.keys(v.attributes).length > 0 ? v.attributes : null
                }));
            } else {
                payloadVariants = [
                    {
                        sku: `SKU-${Date.now()}`,
                        price: parseFloat(formData.price) || 0,
                        stock: parseInt(formData.stock, 10) || 0,
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
                imageUrl: formData.image_url,
                category: formData.category || 'General',
                event_id: parseInt(formData.event_id, 10),
                eventId: parseInt(formData.event_id, 10),
                max_per_person: parseInt(formData.max_per_person, 10) || 5,
                maxPerPerson: parseInt(formData.max_per_person, 10) || 5,
                delivery_methods: dMethods,
                deliveryMethods: dMethods,
                attributes_schema: parsedAttributes,
                attributesSchema: parsedAttributes,
                variants: payloadVariants
            };

            if (editingId) {
                await merchService.updateMerchandise(editingId, payload);
                success('Mercancía actualizada con éxito');
            } else {
                await merchService.createMerchandise(payload);
                success('Mercancía registrada y enviada a revisión');
            }

            setShowModal(false);
            setEditingId(null);
            resetForm();
            loadInitialData();
        } catch (error) {
            console.error(error);
            showError(editingId ? 'Error al actualizar mercancía' : 'Error al crear mercancía');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditClick = (item) => {
        setEditingId(item.id);

        // Load attributes
        const rawAttrs = item.attributesSchema || item.attributes_schema;
        const attrs = [];
        if (rawAttrs && typeof rawAttrs === 'object') {
            Object.entries(rawAttrs).forEach(([name, values]) => {
                const valStr = Array.isArray(values) ? values.join(', ') : String(values);
                attrs.push({ name, values: valStr });
            });
        }
        setFormAttributes(attrs.length > 0 ? attrs : [{ name: '', values: '' }]);

        // Load variants
        const populatedVariants = item.variants ? item.variants.map(v => ({
            id: v.id,
            sku: v.sku || '',
            price: v.price != null ? v.price.toString() : '',
            stock: v.stock != null ? v.stock.toString() : '',
            attributes: v.attributes || {}
        })) : [];
        setVariants(populatedVariants);

        const rawImg = item.imageUrl || item.image_url || '';
        const eventIdVal = item.eventId || item.event_id || item.event?.id || '';
        const rawDeliveryMethods = item.deliveryMethods || item.delivery_methods || [];

        setFormData({
            name: item.name || '',
            description: item.description || '',
            price: item.variants?.[0]?.price != null ? item.variants[0].price.toString() : (item.price != null ? item.price.toString() : ''),
            stock: item.variants?.[0]?.stock != null ? item.variants[0].stock.toString() : (item.stock != null ? item.stock.toString() : ''),
            category: item.category || '',
            image_url: rawImg,
            event_id: eventIdVal ? eventIdVal.toString() : '',
            max_per_person: (item.maxPerPerson || item.max_per_person || '5').toString(),
            delivery_pickup: Array.isArray(rawDeliveryMethods) ? rawDeliveryMethods.includes('PICKUP_AT_EVENT') : true,
            delivery_home: Array.isArray(rawDeliveryMethods) ? rawDeliveryMethods.includes('HOME_DELIVERY') : false
        });
        setUploadType(rawImg ? 'url' : 'file');
        setShowModal(true);
    };

    const handleDeleteClick = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este producto del catálogo?')) return;
        try {
            await merchService.deleteMerchandise(id);
            success('Producto eliminado correctamente');
            loadInitialData();
        } catch {
            showError('Error al eliminar el producto');
        }
    };

    /**
     * Resolves event name without ever returning "Evento #undefined"
     */
    const getEventName = (item) => {
        if (item.eventName || item.event_name) return item.eventName || item.event_name;
        if (item.event?.name) return item.event.name;
        const eventId = item.eventId || item.event_id || item.event?.id;
        if (!eventId) return 'General';
        const ev = myEvents.find(e => String(e.id) === String(eventId));
        return ev ? ev.name : `Evento #${eventId}`;
    };

    // Bento KPI stats
    const stats = useMemo(() => {
        const totalProducts = merchItems.length;
        let totalStock = 0;
        let totalVariants = 0;
        const eventIds = new Set();

        merchItems.forEach(item => {
            const evId = item.eventId || item.event_id || item.event?.id;
            if (evId) eventIds.add(String(evId));

            if (item.variants && item.variants.length > 0) {
                totalVariants += item.variants.length;
                totalStock += item.variants.reduce((acc, v) => acc + (parseInt(v.stock, 10) || 0), 0);
            } else {
                totalStock += parseInt(item.stock, 10) || 0;
            }
        });

        return {
            totalProducts,
            totalStock,
            activeEventsCount: eventIds.size,
            totalVariants
        };
    }, [merchItems]);

    // Categories list for filter pills
    const availableCategories = useMemo(() => {
        const cats = new Set(merchItems.map(i => i.category).filter(Boolean));
        return Array.from(cats);
    }, [merchItems]);

    // Filtered items
    const filteredItems = useMemo(() => {
        return merchItems.filter(item => {
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const nameMatch = (item.name || '').toLowerCase().includes(term);
                const descMatch = (item.description || '').toLowerCase().includes(term);
                const catMatch = (item.category || '').toLowerCase().includes(term);
                const skuMatch = item.variants?.some(v => (v.sku || '').toLowerCase().includes(term));
                if (!nameMatch && !descMatch && !catMatch && !skuMatch) return false;
            }

            if (filterEvent !== 'all') {
                const evId = String(item.eventId || item.event_id || item.event?.id || '');
                if (evId !== String(filterEvent)) return false;
            }

            if (filterCategory !== 'all') {
                if ((item.category || '').toLowerCase() !== filterCategory.toLowerCase()) return false;
            }

            if (filterStatus !== 'all') {
                const status = (item.adminStatus || item.admin_status || 'approved').toLowerCase();
                if (status !== filterStatus.toLowerCase()) return false;
            }

            return true;
        });
    }, [merchItems, searchTerm, filterEvent, filterCategory, filterStatus]);

    if (settingsLoading) {
        return (
            <div className="merch-loading-screen">
                <ShoppingBag size={40} className="merch-spinner-icon" />
                <span>Cargando catálogo de mercancía...</span>
            </div>
        );
    }

    const hasGlobalEnabled = settings?.is_enabled || settings?.isEnabled;
    const hasAnyEventEnabled = myEvents.some(ev => ev.merch_enabled);
    const isAllowed = hasGlobalEnabled || hasAnyEventEnabled;

    if (!isAllowed) {
        return (
            <div className="merch-disabled-card">
                <div className="merch-disabled-icon-wrap">
                    <AlertCircle size={48} />
                </div>
                <h3 className="merch-disabled-title">Módulo de Mercancía Desactivado</h3>
                <p className="merch-disabled-text">
                    Tu cuenta no tiene habilitada la venta de souvenirs ni eventos autorizados para este módulo.
                </p>
                <p className="merch-disabled-hint">
                    Por favor contacta al administrador de la plataforma para desbloquear la tienda oficial.
                </p>
            </div>
        );
    }

    return (
        <div className="merch-page">
            {/* TOP NAVIGATION & HEADER */}
            <header className="merch-header">
                <div className="merch-header-main">
                    <button
                        type="button"
                        className="merch-back-btn"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft size={16} />
                        <span>Volver</span>
                    </button>
                    <div>
                        <div className="merch-breadcrumb">
                            <span>Gestión</span>
                            <span className="merch-breadcrumb-sep">/</span>
                            <span>Tienda & Souvenirs</span>
                        </div>
                        <h1 className="merch-title">Constructor de Mercancía</h1>
                        <p className="merch-subtitle">
                            Crea, cotiza y administra el inventario oficial de souvenirs para todos tus eventos.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    className="merch-primary-action-btn"
                    onClick={() => { resetForm(); setShowModal(true); }}
                >
                    <Plus size={18} />
                    <span>Crear Producto</span>
                </button>
            </header>

            {/* PARTIAL ACCESS NOTICE */}
            {!hasGlobalEnabled && (
                <div className="merch-alert-bento">
                    <div className="merch-alert-icon">
                        <AlertCircle size={20} />
                    </div>
                    <div className="merch-alert-content">
                        <strong className="merch-alert-title">Acceso Parcial por Evento Autorizado</strong>
                        <p className="merch-alert-text">
                            Tu cuenta opera con permisos específicos por evento. Podrás publicar y gestionar inventario únicamente para aquellos eventos que tengan la función de mercancía habilitada por el administrador.
                        </p>
                    </div>
                </div>
            )}

            {/* BENTO KPI ROW */}
            <div className="merch-kpi-grid">
                <div className="merch-kpi-card">
                    <div className="merch-kpi-header">
                        <span className="merch-kpi-label">Total Productos</span>
                        <div className="merch-kpi-icon merch-kpi-icon--purple">
                            <ShoppingBag size={20} />
                        </div>
                    </div>
                    <div className="merch-kpi-value">{stats.totalProducts}</div>
                    <div className="merch-kpi-sub">Artículos catalogados</div>
                </div>

                <div className="merch-kpi-card">
                    <div className="merch-kpi-header">
                        <span className="merch-kpi-label">Stock Total</span>
                        <div className="merch-kpi-icon merch-kpi-icon--green">
                            <Package size={20} />
                        </div>
                    </div>
                    <div className="merch-kpi-value">{stats.totalStock.toLocaleString()}</div>
                    <div className="merch-kpi-sub">Unidades en inventario</div>
                </div>

                <div className="merch-kpi-card">
                    <div className="merch-kpi-header">
                        <span className="merch-kpi-label">Eventos con Tienda</span>
                        <div className="merch-kpi-icon merch-kpi-icon--amber">
                            <Calendar size={20} />
                        </div>
                    </div>
                    <div className="merch-kpi-value">{stats.activeEventsCount}</div>
                    <div className="merch-kpi-sub">Eventos con mercancía activa</div>
                </div>

                <div className="merch-kpi-card">
                    <div className="merch-kpi-header">
                        <span className="merch-kpi-label">Variantes Totales</span>
                        <div className="merch-kpi-icon merch-kpi-icon--blue">
                            <Layers size={20} />
                        </div>
                    </div>
                    <div className="merch-kpi-value">{stats.totalVariants}</div>
                    <div className="merch-kpi-sub">Combinaciones de tallas/SKU</div>
                </div>
            </div>

            {/* TOOLBAR: SEARCH & FILTERS */}
            <div className="merch-toolbar">
                <div className="merch-search-box">
                    <Search size={18} className="merch-search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar por producto, descripción o categoría..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="merch-search-input"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            className="merch-search-clear"
                            onClick={() => setSearchTerm('')}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="merch-filters-group">
                    <select
                        value={filterEvent}
                        onChange={(e) => setFilterEvent(e.target.value)}
                        className="merch-filter-select"
                    >
                        <option value="all">Todos los Eventos ({myEvents.length})</option>
                        {myEvents.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                        ))}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="merch-filter-select"
                    >
                        <option value="all">Todos los Estados</option>
                        <option value="approved">Aprobados</option>
                        <option value="pending_review">En Revisión</option>
                        <option value="rejected">Rechazados</option>
                    </select>

                    {(searchTerm || filterEvent !== 'all' || filterCategory !== 'all' || filterStatus !== 'all') && (
                        <button
                            type="button"
                            className="merch-reset-filter-btn"
                            onClick={() => {
                                setSearchTerm('');
                                setFilterEvent('all');
                                setFilterCategory('all');
                                setFilterStatus('all');
                            }}
                            title="Restablecer filtros"
                        >
                            <RotateCcw size={14} />
                            <span>Limpiar</span>
                        </button>
                    )}
                </div>
            </div>

            {/* CATEGORY PILL CHIPS */}
            {availableCategories.length > 0 && (
                <div className="merch-category-pills">
                    <button
                        type="button"
                        className={`merch-cat-pill ${filterCategory === 'all' ? 'merch-cat-pill--active' : ''}`}
                        onClick={() => setFilterCategory('all')}
                    >
                        Todos ({merchItems.length})
                    </button>
                    {availableCategories.map(cat => {
                        const count = merchItems.filter(i => (i.category || '').toLowerCase() === cat.toLowerCase()).length;
                        return (
                            <button
                                key={cat}
                                type="button"
                                className={`merch-cat-pill ${filterCategory.toLowerCase() === cat.toLowerCase() ? 'merch-cat-pill--active' : ''}`}
                                onClick={() => setFilterCategory(cat)}
                            >
                                {cat} ({count})
                            </button>
                        );
                    })}
                </div>
            )}

            {/* CATALOG CONTENT */}
            {loading ? (
                <div className="merch-empty-state">
                    <ShoppingBag size={48} className="merch-spinner-icon" />
                    <span>Cargando productos oficiales...</span>
                </div>
            ) : merchItems.length === 0 ? (
                <div className="merch-empty-state">
                    <div className="merch-empty-icon-wrap">
                        <ShoppingBag size={48} />
                    </div>
                    <h3 className="merch-empty-title">No hay productos en tu catálogo aún</h3>
                    <p className="merch-empty-text">
                        Comienza publicando playeras, gorras, tazas, posters o artículos oficiales para los asistentes de tus eventos.
                    </p>
                    <button
                        type="button"
                        className="merch-primary-action-btn"
                        onClick={() => { resetForm(); setShowModal(true); }}
                    >
                        <Plus size={18} />
                        <span>Crear mi primer producto</span>
                    </button>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="merch-empty-state">
                    <Search size={44} style={{ opacity: 0.4 }} />
                    <h3 className="merch-empty-title">Sin resultados coincidentes</h3>
                    <p className="merch-empty-text">
                        No se encontraron productos con los criterios de búsqueda seleccionados.
                    </p>
                    <button
                        type="button"
                        className="merch-reset-filter-btn merch-reset-filter-btn--lg"
                        onClick={() => {
                            setSearchTerm('');
                            setFilterEvent('all');
                            setFilterCategory('all');
                            setFilterStatus('all');
                        }}
                    >
                        <RotateCcw size={16} />
                        <span>Restablecer Filtros</span>
                    </button>
                </div>
            ) : (
                <div className="merch-grid">
                    {filteredItems.map(item => {
                        const rawImg = item.imageUrl || item.image_url;
                        const firstImg = rawImg ? rawImg.split(',')[0].trim() : null;
                        const eventId = item.eventId || item.event_id || item.event?.id;
                        const eventName = getEventName(item);
                        const status = (item.adminStatus || item.admin_status || 'approved').toLowerCase();

                        // Price calculation
                        const priceMin = item.variants && item.variants.length > 0
                            ? Math.min(...item.variants.map(v => parseFloat(v.price) || 0))
                            : (parseFloat(item.price) || 0);

                        // Stock calculation
                        const totalStock = item.variants && item.variants.length > 0
                            ? item.variants.reduce((acc, v) => acc + (parseInt(v.stock, 10) || 0), 0)
                            : (parseInt(item.stock, 10) || 0);

                        const formattedPrice = new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: 'MXN',
                            minimumFractionDigits: 2
                        }).format(priceMin);

                        return (
                            <article key={item.id} className="merch-item-card">
                                {/* CARD MEDIA WRAPPER */}
                                <div className="merch-item-image-wrapper">
                                    <div className="merch-card-topbar">
                                        <span className="merch-badge-category">
                                            <Tag size={11} />
                                            <span>{item.category || 'General'}</span>
                                        </span>

                                        <span className={`merch-badge-status merch-badge-status--${status}`}>
                                            {status === 'approved' && (
                                                <>
                                                    <CheckCircle2 size={11} />
                                                    <span>Aprobado</span>
                                                </>
                                            )}
                                            {status === 'pending_review' && (
                                                <>
                                                    <Clock size={11} />
                                                    <span>En Revisión</span>
                                                </>
                                            )}
                                            {status === 'rejected' && (
                                                <>
                                                    <AlertCircle size={11} />
                                                    <span>Rechazado</span>
                                                </>
                                            )}
                                            {!['approved', 'pending_review', 'rejected'].includes(status) && (
                                                <span>{status}</span>
                                            )}
                                        </span>
                                    </div>

                                    <MerchCardImage
                                        src={firstImg}
                                        alt={item.name}
                                        category={item.category}
                                    />
                                </div>

                                {/* CARD BODY */}
                                <div className="merch-item-body">
                                    {/* Event Badge */}
                                    <div className="merch-item-event-badge" title={`Evento: ${eventName}`}>
                                        <Calendar size={13} />
                                        <span className="merch-event-label">{eventName}</span>
                                    </div>

                                    <h3 className="merch-item-name" title={item.name}>{item.name}</h3>
                                    <p className="merch-item-desc" title={item.description}>
                                        {item.description || 'Sin descripción adicional proporcionada.'}
                                    </p>

                                    {/* Price & Stock Bento Block */}
                                    <div className="merch-item-metrics">
                                        <div className="merch-metric-price-wrap">
                                            <span className="merch-metric-label">Precio</span>
                                            <span className="merch-metric-price">{formattedPrice}</span>
                                        </div>

                                        <div className="merch-metric-stock-wrap">
                                            <span className="merch-metric-label">Inventario</span>
                                            <span className={`merch-stock-badge ${totalStock === 0 ? 'merch-stock-badge--out' : totalStock <= 10 ? 'merch-stock-badge--low' : 'merch-stock-badge--ok'}`}>
                                                {totalStock} {totalStock === 1 ? 'pza' : 'pzas'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Variant pill if available */}
                                    {item.variants && item.variants.length > 0 && (
                                        <div className="merch-variants-pill-row">
                                            <span className="merch-variant-count-tag">
                                                <Layers size={11} />
                                                {item.variants.length} {item.variants.length === 1 ? 'variante' : 'variantes de tallas'}
                                            </span>
                                        </div>
                                    )}

                                    {/* ACTIONS */}
                                    <div className="merch-item-actions">
                                        <button
                                            type="button"
                                            className="merch-action-btn merch-action-btn--edit"
                                            onClick={() => handleEditClick(item)}
                                        >
                                            <Edit size={14} />
                                            <span>Editar</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="merch-action-btn merch-action-btn--delete"
                                            onClick={() => handleDeleteClick(item.id)}
                                        >
                                            <Trash2 size={14} />
                                            <span>Eliminar</span>
                                        </button>
                                    </div>

                                    {eventId && (
                                        <button
                                            type="button"
                                            className="merch-action-btn merch-action-btn--link"
                                            onClick={() => navigate(`/events/manage/${eventId}?tab=merch`)}
                                        >
                                            <span>Ver en Evento</span>
                                            <ExternalLink size={13} />
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* CREATE / EDIT MODAL */}
            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setEditingId(null);
                    resetForm();
                }}
                title={editingId ? 'Editar Mercancía' : 'Registrar Nuevo Producto Oficial'}
                size="large"
                className="merch-form-modal"
            >
                <form onSubmit={handleCreateMerch} className="merch-modal-form">
                    <div className="merch-form-split-grid">
                        {/* COLUMN 1: Basic Info */}
                        <div className="merch-form-col">
                            <div className="merch-form-field">
                                <label className="merch-form-label">
                                    <Calendar size={13} />
                                    <span>Asignar a Evento *</span>
                                </label>
                                <select
                                    value={formData.event_id}
                                    onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                                    required
                                    className="merch-input"
                                >
                                    <option value="">-- Seleccionar Evento --</option>
                                    {myEvents
                                        .filter(ev => hasGlobalEnabled || ev.merch_enabled)
                                        .map(ev => (
                                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                                        ))}
                                </select>
                            </div>

                            <div className="merch-form-field">
                                <label className="merch-form-label">
                                    <Tag size={13} />
                                    <span>Nombre del Producto *</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej. Sudadera Oficial Afterlife"
                                    required
                                    className="merch-input"
                                />
                            </div>

                            <div className="merch-form-field">
                                <label className="merch-form-label">
                                    <Sparkles size={13} />
                                    <span>Categoría *</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="Ej. Ropa, Souvenirs..."
                                    required
                                    className="merch-input"
                                />
                                <div className="merch-form-quick-categories">
                                    {QUICK_CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            className={`merch-quick-cat-btn ${formData.category === cat ? 'merch-quick-cat-btn--active' : ''}`}
                                            onClick={() => setFormData({ ...formData, category: cat })}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="merch-form-field">
                                <label className="merch-form-label">
                                    <span>Descripción del Artículo *</span>
                                </label>
                                <textarea
                                    rows="3"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe material, acabados, recomendaciones de cuidado..."
                                    required
                                    className="merch-input merch-textarea"
                                />
                            </div>
                        </div>

                        {/* COLUMN 2: Pricing, Stock & Image */}
                        <div className="merch-form-col">
                            <div className="merch-form-row-2">
                                <div className="merch-form-field">
                                    <label className="merch-form-label">
                                        <span>Precio Base ($ MXN)</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="0.00"
                                        required={variants.length === 0}
                                        className="merch-input"
                                    />
                                </div>
                                <div className="merch-form-field">
                                    <label className="merch-form-label">
                                        <span>Stock Base</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                        placeholder="0"
                                        required={variants.length === 0}
                                        className="merch-input"
                                    />
                                </div>
                            </div>

                            {/* Limite por persona & Entrega */}
                            <div className="merch-form-row-2">
                                <div className="merch-form-field">
                                    <label className="merch-form-label">
                                        <span>Límite por Asistente</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.max_per_person}
                                        onChange={(e) => setFormData({ ...formData, max_per_person: e.target.value })}
                                        className="merch-input"
                                    />
                                </div>

                                <div className="merch-form-field">
                                    <label className="merch-form-label">
                                        <span>Métodos de Entrega</span>
                                    </label>
                                    <div className="merch-delivery-checkboxes">
                                        <label className="merch-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.delivery_pickup}
                                                onChange={(e) => setFormData({ ...formData, delivery_pickup: e.target.checked })}
                                            />
                                            <span>Punto de recogida</span>
                                        </label>
                                        <label className="merch-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.delivery_home}
                                                onChange={(e) => setFormData({ ...formData, delivery_home: e.target.checked })}
                                            />
                                            <span>Envío a domicilio</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Image Uploader */}
                            <div className="merch-form-field">
                                <label className="merch-form-label">
                                    <span>Fotografía del Producto</span>
                                </label>
                                <div className="merch-upload-tabs">
                                    <button
                                        type="button"
                                        className={`merch-upload-tab ${uploadType === 'file' ? 'merch-upload-tab--active' : ''}`}
                                        onClick={() => setUploadType('file')}
                                    >
                                        <UploadCloud size={14} />
                                        <span>Subir Archivo</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`merch-upload-tab ${uploadType === 'url' ? 'merch-upload-tab--active' : ''}`}
                                        onClick={() => setUploadType('url')}
                                    >
                                        <LinkIcon size={14} />
                                        <span>Enlace URL</span>
                                    </button>
                                </div>

                                {uploadType === 'file' ? (
                                    <label
                                        htmlFor="manager-merch-file-input"
                                        className="merch-dropzone-box"
                                    >
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            disabled={uploading}
                                            id="manager-merch-file-input"
                                            className="hidden"
                                        />
                                        <UploadCloud size={24} className="merch-dropzone-icon" />
                                        <span className="merch-dropzone-title">
                                            {uploading ? 'Subiendo archivo al servidor...' : 'Haz clic o arrastra una imagen'}
                                        </span>
                                        <span className="merch-dropzone-hint">
                                            Formatos PNG, JPG, WEBP recomendados (máx. 5MB)
                                        </span>
                                    </label>
                                ) : (
                                    <div className="merch-url-input-group">
                                        <input
                                            type="url"
                                            id="manager-url-input-temp"
                                            placeholder="https://ejemplo.com/producto.jpg"
                                            className="merch-input"
                                        />
                                        <button
                                            type="button"
                                            className="merch-url-add-btn"
                                            onClick={() => {
                                                const input = document.getElementById('manager-url-input-temp');
                                                if (input && input.value) {
                                                    const currentImages = formData.image_url ? formData.image_url.split(',') : [];
                                                    currentImages.push(input.value.trim());
                                                    setFormData(prev => ({ ...prev, image_url: currentImages.join(',') }));
                                                    input.value = '';
                                                }
                                            }}
                                        >
                                            Añadir
                                        </button>
                                    </div>
                                )}

                                {/* Image previews list */}
                                {formData.image_url && (
                                    <div className="merch-thumbs-container">
                                        <span className="merch-thumbs-label">
                                            Imágenes añadidas ({formData.image_url.split(',').filter(Boolean).length}):
                                        </span>
                                        <div className="merch-thumbs-list">
                                            {formData.image_url.split(',').filter(Boolean).map((url, idx) => (
                                                <div key={idx} className="merch-thumb-card">
                                                    <img src={getImageUrl(url.trim())} alt={`Preview ${idx + 1}`} />
                                                    <button
                                                        type="button"
                                                        className="merch-thumb-remove-btn"
                                                        onClick={() => {
                                                            const imgs = formData.image_url.split(',').filter(Boolean);
                                                            imgs.splice(idx, 1);
                                                            setFormData(prev => ({ ...prev, image_url: imgs.join(',') }));
                                                        }}
                                                        title="Eliminar imagen"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SECTION: ASISTENTE RÁPIDO DE TALLAS */}
                    <div className="merch-bento-subpanel">
                        <div className="merch-bento-subpanel-header">
                            <div>
                                <h4 className="merch-bento-subpanel-title">Asistente Rápido de Tallas</h4>
                                <p className="merch-bento-subpanel-desc">
                                    Activa las tallas disponibles y asigna el stock disponible para cada una.
                                </p>
                            </div>
                        </div>

                        <div className="merch-sizes-grid">
                            {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => {
                                const isChecked = variants.some(v => v.attributes && v.attributes.talla && v.attributes.talla.toUpperCase() === size.toUpperCase());
                                const matchedVar = variants.find(v => v.attributes && v.attributes.talla && v.attributes.talla.toUpperCase() === size.toUpperCase());
                                const stockVal = matchedVar ? matchedVar.stock : '';

                                return (
                                    <div key={size} className={`merch-size-tile ${isChecked ? 'merch-size-tile--checked' : ''}`}>
                                        <label className="merch-size-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => handleSizeCheckboxChange(size, e.target.checked)}
                                            />
                                            <span>Talla {size}</span>
                                        </label>
                                        {isChecked && (
                                            <div className="merch-size-stock-input-wrap">
                                                <span className="merch-size-stock-label">Stock:</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={stockVal}
                                                    onChange={(e) => handleSizeStockChange(size, e.target.value)}
                                                    required
                                                    className="merch-size-input"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION: CUSTOM ATTRIBUTES */}
                    <div className="merch-bento-subpanel">
                        <div className="merch-bento-subpanel-header">
                            <div>
                                <h4 className="merch-bento-subpanel-title">Opciones Adicionales (Color, Edición, Modelo)</h4>
                                <p className="merch-bento-subpanel-desc">
                                    Define atributos extra con sus opciones separadas por coma.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="merch-subpanel-action-btn"
                                onClick={handleAddAttributeRow}
                            >
                                <Plus size={14} />
                                <span>Agregar Opción</span>
                            </button>
                        </div>

                        <div className="merch-attrs-list">
                            {formAttributes.map((attr, idx) => (
                                <div key={idx} className="merch-attr-row-card">
                                    <input
                                        type="text"
                                        className="merch-input merch-attr-input-name"
                                        placeholder="Nombre (ej. Color, Material)"
                                        value={attr.name}
                                        onChange={(e) => handleAttributeRowChange(idx, 'name', e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        className="merch-input merch-attr-input-values"
                                        placeholder="Valores separados por coma (ej. Negro, Blanco, Azul)"
                                        value={attr.values}
                                        onChange={(e) => handleAttributeRowChange(idx, 'values', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="merch-attr-remove-btn"
                                        onClick={() => handleRemoveAttributeRow(idx)}
                                        title="Eliminar atributo"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SECTION: VARIANTS TABLE */}
                    <div className="merch-bento-subpanel">
                        <div className="merch-bento-subpanel-header">
                            <div>
                                <h4 className="merch-bento-subpanel-title">Variantes & Desglose de Inventario</h4>
                                <p className="merch-bento-subpanel-desc">
                                    Gestiona el SKU, precio y stock individual por cada combinación.
                                </p>
                            </div>
                            <div className="merch-variants-header-actions">
                                <button
                                    type="button"
                                    className="merch-subpanel-action-btn merch-subpanel-action-btn--accent"
                                    onClick={handleGenerateVariants}
                                >
                                    <Sparkles size={14} />
                                    <span>Generar Variantes</span>
                                </button>
                                <button
                                    type="button"
                                    className="merch-subpanel-action-btn"
                                    onClick={handleAddManualVariant}
                                >
                                    <Plus size={14} />
                                    <span>Manual</span>
                                </button>
                            </div>
                        </div>

                        {variants.length > 0 ? (
                            <div className="merch-variants-table-wrap">
                                <table className="merch-variants-table">
                                    <thead>
                                        <tr>
                                            <th>Atributos</th>
                                            <th>SKU</th>
                                            <th className="text-right">Precio ($)</th>
                                            <th className="text-right">Stock</th>
                                            <th className="text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {variants.map((v, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    {v.attributes && Object.keys(v.attributes).length > 0 ? (
                                                        <div className="merch-variant-pill-cell">
                                                            {Object.entries(v.attributes).map(([key, val]) => (
                                                                <span key={key} className="merch-variant-pill-tag">
                                                                    {key}: <strong>{val || 'sin definir'}</strong>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="merch-muted-text">Estándar</span>
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
                                                <td className="text-right">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={v.price}
                                                        onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                                                        className="merch-table-input merch-table-input--num"
                                                    />
                                                </td>
                                                <td className="text-right">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={v.stock}
                                                        onChange={(e) => handleVariantChange(idx, 'stock', e.target.value)}
                                                        className="merch-table-input merch-table-input--num"
                                                    />
                                                </td>
                                                <td className="text-center">
                                                    <button
                                                        type="button"
                                                        className="merch-table-remove-btn"
                                                        onClick={() => handleRemoveVariant(idx)}
                                                        title="Eliminar variante"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="merch-variants-empty">
                                <span>No hay variantes definidas. Se usará el Precio y Stock Base registrados arriba.</span>
                            </div>
                        )}
                    </div>

                    {/* MODAL FOOTER */}
                    <div className="merch-modal-footer">
                        <button
                            type="button"
                            className="merch-modal-cancel-btn"
                            onClick={() => {
                                setShowModal(false);
                                setEditingId(null);
                                resetForm();
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="merch-modal-submit-btn"
                            disabled={submitting || uploading}
                        >
                            {submitting ? 'Guardando cambios...' : editingId ? 'Guardar Cambios' : 'Enviar a Revisión'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ManagerMerchandise;
