import React, { useState, useEffect, useCallback } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { Button, Modal } from '../../components';
import Pagination from '../../components/Pagination/Pagination';
import { merchService } from '../../services/merch.service';
import api from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';
import { 
    Plus, 
    Edit, 
    Trash, 
    ShoppingBag, 
    UploadCloud, 
    Link as LinkIcon, 
    Tag, 
    Sparkles, 
    Layers, 
    DollarSign,
    Check
} from 'lucide-react';
import './MerchandisePanel.css';

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
            <div className="merch-no-img">
                <div className="merch-fallback-icon-wrap">
                    <ShoppingBag size={28} />
                </div>
                <span className="merch-fallback-label">{category || 'Artículo Oficial'}</span>
            </div>
        );
    }

    return (
        <img 
            src={resolvedUrl} 
            alt={alt || 'Producto'} 
            className="merch-img" 
            onError={() => setImgError(true)} 
            loading="lazy"
        />
    );
};

const MerchandisePanel = ({ eventId, event }) => {
    const { success, error: showError } = useNotification();
    const [merchItems, setMerchItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 6;
    
    // Config settings check
    const [settings, setSettings] = useState(null);
    const [settingsLoading, setSettingsLoading] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: 'Ropa',
        image_url: ''
    });
    const [uploadType, setUploadType] = useState('file'); // 'file' or 'url'
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const res = await api.manager.uploadImage(file);
            if (res && res.url) {
                setFormData(prev => ({ ...prev, image_url: res.url }));
                success('Imagen subida correctamente');
            } else {
                showError('Error al subir imagen');
            }
        } catch (err) {
            console.error(err);
            showError('Error al subir la imagen');
        } finally {
            setUploading(false);
        }
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        setSettingsLoading(true);
        try {
            try {
                const sett = await merchService.getSettings(event?.assigned_manager_id || 1);
                setSettings(sett);
            } catch (e) {
                console.warn('Could not fetch merch settings, assuming enabled via contract', e);
                setSettings({ isEnabled: true });
            }

            const items = await merchService.getAllMerchandise(null, null, eventId, null);
            setMerchItems(items || []);
        } catch (error) {
            console.error('Error fetching merchandise:', error);
            showError('Error al cargar la mercancía');
        } finally {
            setLoading(false);
            setSettingsLoading(false);
        }
    }, [event?.assigned_manager_id, eventId, showError]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCreateMerch = async (e) => {
        e.preventDefault();
        if (submitting) return;

        try {
            if (!settings?.isEnabled && !event?.merch_enabled) {
                showError('La herramienta de mercancía no está habilitada para este evento.');
                return;
            }

            setSubmitting(true);

            const payload = {
                name: formData.name,
                description: formData.description,
                image_url: formData.image_url,
                category: formData.category || 'General',
                event_id: parseInt(eventId),
                admin_status: 'approved',
                status: 'published',
                variants: [
                    {
                        ...(formData.variant_id ? { id: formData.variant_id } : {}),
                        sku: formData.sku || `SKU-${Date.now()}`,
                        price: parseFloat(formData.price || 0),
                        stock: parseInt(formData.stock || 0),
                    }
                ]
            };

            if (editingId) {
                await merchService.updateMerchandise(editingId, payload);
                success('Mercancía actualizada con éxito');
            } else {
                await merchService.createMerchandise(payload);
                success('Producto añadido con éxito');
            }

            setShowModal(false);
            setEditingId(null);
            setFormData({ name: '', description: '', price: '', stock: '', category: 'Ropa', image_url: '', variant_id: '', sku: '' });
            loadData();
        } catch (error) {
            console.error(error);
            showError(editingId ? 'Error al actualizar mercancía' : 'Error al crear mercancía');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditClick = (item) => {
        setEditingId(item.id);
        setFormData({
            name: item.name || '',
            description: item.description || '',
            price: item.variants?.[0]?.price != null ? String(item.variants[0].price) : '',
            stock: item.variants?.[0]?.stock != null ? String(item.variants[0].stock) : '',
            category: item.category || 'General',
            image_url: item.imageUrl || item.image_url || '',
            variant_id: item.variants?.[0]?.id || '',
            sku: item.variants?.[0]?.sku || ''
        });
        setUploadType((item.imageUrl || item.image_url) ? 'url' : 'file');
        setShowModal(true);
    };

    const handleDeleteClick = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
        try {
            await merchService.deleteMerchandise(id);
            success('Producto eliminado correctamente');
            loadData();
        } catch (error) {
            console.error(error);
            showError('Error al eliminar el producto');
        }
    };

    const resetForm = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({ name: '', description: '', price: '', stock: '', category: 'Ropa', image_url: '', variant_id: '', sku: '' });
    };

    if (settingsLoading) {
        return (
            <div className="merch-empty-state">
                <span>Cargando catálogo de mercancía...</span>
            </div>
        );
    }

    if (!settings?.isEnabled && !event?.merch_enabled) {
        return (
            <div className="merch-notice-box">
                <h3 className="merch-notice-title">Módulo de Mercancía Desactivado</h3>
                <p>Tu paquete actual no tiene habilitada la venta de mercancía para este contrato.</p>
            </div>
        );
    }

    if (!event?.merch_enabled) {
        return (
            <div className="merch-notice-box">
                <h3 className="merch-notice-title">Mercancía no habilitada para este evento</h3>
                <p>Puedes habilitar la mercancía en la pestaña de "Configuración" de este evento.</p>
            </div>
        );
    }

    const totalPages = Math.ceil(merchItems.length / pageSize);
    const paginatedItems = merchItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="merch-panel">
            <div className="merch-header">
                <div>
                    <h3 className="merch-header-title">Mercancía Oficial del Evento</h3>
                    <p className="merch-header-subtitle">
                        Gestiona productos oficiales, souvenirs y artículos disponibles para los asistentes.
                    </p>
                </div>
                <Button 
                    variant="primary" 
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ name: '', description: '', price: '', stock: '', category: 'Ropa', image_url: '', variant_id: '', sku: '' });
                        setShowModal(true);
                    }} 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={16} /> Añadir Producto
                </Button>
            </div>

            {loading ? (
                <div className="merch-empty-state">
                    <span>Cargando artículos...</span>
                </div>
            ) : merchItems.length === 0 ? (
                <div className="merch-empty-state">
                    <ShoppingBag size={48} style={{ color: 'var(--manager-accent, #6366f1)', opacity: 0.6 }} />
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--manager-text)' }}>
                        No hay productos registrados en este evento aún.
                    </span>
                    <span style={{ fontSize: '0.88rem', color: 'var(--manager-text-muted)' }}>
                        Comienza publicando playeras, gorras, tazas o souvenirs oficiales.
                    </span>
                    <Button 
                        variant="primary" 
                        onClick={() => {
                            setEditingId(null);
                            setShowModal(true);
                        }} 
                        style={{ marginTop: '0.5rem' }}
                    >
                        Crear Primer Producto
                    </Button>
                </div>
            ) : (
                <>
                    <div className="merch-grid">
                        {paginatedItems.map(item => {
                            const rawImg = item.imageUrl || item.image_url;
                            const price = item.variants?.[0]?.price != null ? Number(item.variants[0].price).toFixed(2) : '0.00';
                            const stock = item.variants?.[0]?.stock != null ? item.variants[0].stock : 0;
                            const status = item.adminStatus || item.admin_status || 'approved';

                            return (
                                <div key={item.id} className="merch-card">
                                    <div className="merch-image-wrapper">
                                        {/* Structured overlay header preventing any badge collision */}
                                        <div className="merch-card-topbar">
                                            <span className="merch-badge-category">
                                                <Tag size={10} style={{ display: 'inline', marginRight: '3px' }} />
                                                {item.category || 'General'}
                                            </span>

                                            <span className={`merch-badge-status merch-badge-${status}`}>
                                                {status === 'approved' ? 'Publicado' :
                                                 status === 'pending_review' ? 'En Revisión' : 'Rechazado'}
                                            </span>
                                        </div>

                                        <MerchCardImage 
                                            src={rawImg} 
                                            alt={item.name} 
                                            category={item.category} 
                                        />
                                    </div>

                                    <div className="merch-body">
                                        <h4 className="merch-title">{item.name}</h4>
                                        <p className="merch-desc">{item.description || 'Sin descripción adicional.'}</p>
                                        
                                        <div className="merch-meta">
                                            <div className="merch-price-group">
                                                <span className="merch-currency-symbol">$</span>
                                                <span className="merch-price">{price}</span>
                                            </div>
                                            <span className={`merch-stock ${stock <= 5 ? 'merch-stock--low' : ''}`}>
                                                Stock: {stock} uds
                                            </span>
                                        </div>

                                        <div className="merch-actions">
                                            <button 
                                                type="button" 
                                                className="merch-btn-edit" 
                                                onClick={() => handleEditClick(item)}
                                            >
                                                <Edit size={14} /> Editar
                                            </button>
                                            <button 
                                                type="button" 
                                                className="merch-btn-delete" 
                                                onClick={() => handleDeleteClick(item.id)}
                                            >
                                                <Trash size={14} /> Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {totalPages > 1 && (
                        <div style={{ marginTop: '2rem' }}>
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Modal: Rediseñado Bento Box de 2 Columnas con Vista Previa en Vivo */}
            <Modal 
                isOpen={showModal} 
                onClose={resetForm} 
                title={editingId ? "Editar Producto de Mercancía" : "Nuevo Producto Oficial"} 
                size="large"
            >
                <form onSubmit={handleCreateMerch} className="merch-bento-modal">
                    {/* Left Column: Form Controls */}
                    <div className="merch-modal-form-col">
                        <div className="merch-field-group">
                            <label className="merch-field-label">Nombre del Producto</label>
                            <input 
                                type="text"
                                className="merch-field-input"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="Ej. Sudadera Oficial Vive Latino 2026"
                                required
                            />
                        </div>

                        <div className="merch-field-group">
                            <label className="merch-field-label">Categoría</label>
                            <div className="merch-category-chips">
                                {QUICK_CATEGORIES.map(cat => (
                                    <button
                                        type="button"
                                        key={cat}
                                        className={`merch-cat-chip ${formData.category === cat ? 'active' : ''}`}
                                        onClick={() => setFormData({...formData, category: cat})}
                                    >
                                        {formData.category === cat && <Check size={12} />}
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            <input 
                                type="text"
                                className="merch-field-input"
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                placeholder="O escribe una categoría personalizada..."
                            />
                        </div>

                        <div className="merch-form-row">
                            <div className="merch-field-group">
                                <label className="merch-field-label">Precio Unitario ($ MXN)</label>
                                <div className="merch-input-with-affix">
                                    <span className="merch-affix"><DollarSign size={14} /></span>
                                    <input 
                                        type="number" 
                                        className="merch-field-input has-affix"
                                        min="0" 
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="merch-field-group">
                                <label className="merch-field-label">Stock Disponible</label>
                                <div className="merch-input-with-affix">
                                    <span className="merch-affix"><Layers size={14} /></span>
                                    <input 
                                        type="number" 
                                        className="merch-field-input has-affix"
                                        min="0" 
                                        value={formData.stock}
                                        onChange={(e) => setFormData({...formData, stock: e.target.value})}
                                        placeholder="100"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="merch-field-group">
                            <label className="merch-field-label">Descripción</label>
                            <textarea 
                                className="merch-field-textarea"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Detalles de materiales, tallas disponibles o características de este artículo..."
                                required
                            />
                        </div>

                        {/* Image Source Selection */}
                        <div className="merch-field-group">
                            <label className="merch-field-label">Imagen del Producto</label>
                            <div className="merch-upload-toggle">
                                <button
                                    type="button"
                                    className={`merch-toggle-btn ${uploadType === 'file' ? 'active' : ''}`}
                                    onClick={() => setUploadType('file')}
                                >
                                    <UploadCloud size={14} /> Subir Imagen
                                </button>
                                <button
                                    type="button"
                                    className={`merch-toggle-btn ${uploadType === 'url' ? 'active' : ''}`}
                                    onClick={() => setUploadType('url')}
                                >
                                    <LinkIcon size={14} /> URL Externa
                                </button>
                            </div>

                            {uploadType === 'file' ? (
                                <label 
                                    htmlFor="merch-file-input-elem" 
                                    className="merch-dropzone"
                                >
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                        className="merch-hidden-file-input"
                                        id="merch-file-input-elem"
                                    />
                                    <UploadCloud size={30} className="merch-dropzone-icon" />
                                    <span className="merch-dropzone-prompt">
                                        {uploading ? 'Subiendo imagen a la nube...' : formData.image_url ? 'Cambiar imagen actual' : 'Haz clic para seleccionar una foto'}
                                    </span>
                                    <span className="merch-dropzone-hint">
                                        PNG, JPG o WEBP recomendados (hasta 5MB)
                                    </span>
                                </label>
                            ) : (
                                <input 
                                    type="url"
                                    className="merch-field-input"
                                    value={formData.image_url}
                                    onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                                    placeholder="https://ejemplo.com/producto.jpg"
                                    required
                                />
                            )}
                        </div>
                    </div>

                    {/* Right Column: Live Product Card Preview */}
                    <div className="merch-modal-preview-col">
                        <div className="merch-preview-card-wrapper">
                            <div className="merch-preview-tagline">
                                <Sparkles size={13} /> Vista previa en catálogo
                            </div>
                            
                            <div className="merch-card merch-card--preview">
                                <div className="merch-image-wrapper">
                                    <div className="merch-card-topbar">
                                        <span className="merch-badge-category">
                                            <Tag size={10} style={{ display: 'inline', marginRight: '3px' }} />
                                            {formData.category || 'General'}
                                        </span>
                                        <span className="merch-badge-status merch-badge-approved">
                                            En Catálogo
                                        </span>
                                    </div>
                                    <MerchCardImage 
                                        src={formData.image_url} 
                                        alt={formData.name || 'Vista previa'} 
                                        category={formData.category} 
                                    />
                                </div>

                                <div className="merch-body">
                                    <h4 className="merch-title">{formData.name || 'Nombre del Producto'}</h4>
                                    <p className="merch-desc">{formData.description || 'Aquí aparecerá la descripción detallada del artículo para los asistentes.'}</p>
                                    
                                    <div className="merch-meta">
                                        <div className="merch-price-group">
                                            <span className="merch-currency-symbol">$</span>
                                            <span className="merch-price">
                                                {formData.price ? Number(formData.price).toFixed(2) : '0.00'}
                                            </span>
                                        </div>
                                        <span className="merch-stock">
                                            Stock: {formData.stock || 0} uds
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <p className="merch-preview-tip">
                                Así verán este artículo los compradores tanto en la taquilla virtual como en la aplicación móvil.
                            </p>
                        </div>
                    </div>

                    {/* Full Width Footer Action Bar */}
                    <div className="merch-modal-footer-bar">
                        <button 
                            type="button" 
                            className="merch-btn-cancel-modal"
                            onClick={resetForm}
                            disabled={submitting || uploading}
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="merch-btn-submit-modal" 
                            disabled={submitting || uploading}
                        >
                            {submitting ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Añadir Producto'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default MerchandisePanel;
