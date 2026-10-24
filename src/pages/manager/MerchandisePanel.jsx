import React, { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { Button, Modal } from '../../components';
import { merchService } from '../../services/merch.service';
import api from '../../services/api';
import { Plus, Edit, Trash, ShoppingBag, UploadCloud, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import './MerchandisePanel.css';

const MerchandisePanel = ({ eventId, event }) => {
    const { success, error: showError } = useNotification();
    const [merchItems, setMerchItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    // Config settings check
    const [settings, setSettings] = useState(null);
    const [settingsLoading, setSettingsLoading] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: '',
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

    useEffect(() => {
        loadData();
    }, [eventId]);

    const loadData = async () => {
        setLoading(true);
        setSettingsLoading(true);
        try {
            try {
                const sett = await merchService.getSettings(event.assigned_manager_id || 1);
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
    };

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
                category: formData.category || 'general',
                event_id: parseInt(eventId),
                admin_status: 'approved',
                status: 'published',
                variants: [
                    {
                        ...(formData.variant_id ? { id: formData.variant_id } : {}),
                        sku: formData.sku || `SKU-${Date.now()}`,
                        price: parseFloat(formData.price),
                        stock: parseInt(formData.stock),
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
            setFormData({ name: '', description: '', price: '', stock: '', category: '', image_url: '', variant_id: '', sku: '' });
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
            name: item.name,
            description: item.description,
            price: item.variants?.[0]?.price || '',
            stock: item.variants?.[0]?.stock || '',
            category: item.category || '',
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

    return (
        <div className="merch-panel">
            <div className="merch-header">
                <div>
                    <h3 className="merch-header-title">Mercancía Oficial del Evento</h3>
                    <p className="merch-header-subtitle">
                        Gestiona productos oficiales, souvenirs y artículos disponibles para los asistentes.
                    </p>
                </div>
                <Button variant="primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16} /> Añadir Producto
                </Button>
            </div>

            {loading ? (
                <div className="merch-empty-state">
                    <span>Cargando artículos...</span>
                </div>
            ) : merchItems.length === 0 ? (
                <div className="merch-empty-state">
                    <ShoppingBag size={48} style={{ color: '#6366f1', opacity: 0.6 }} />
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                        No hay productos registrados en este evento aún.
                    </span>
                    <span style={{ fontSize: '0.85rem' }}>
                        Comienza publicando playeras, gorras, tazas o souvenirs oficiales.
                    </span>
                    <Button variant="primary" onClick={() => setShowModal(true)} style={{ marginTop: '0.5rem' }}>
                        Crear Primer Producto
                    </Button>
                </div>
            ) : (
                <div className="merch-grid">
                    {merchItems.map(item => {
                        const img = item.imageUrl || item.image_url;
                        const price = item.variants?.[0]?.price || '0';
                        const stock = item.variants?.[0]?.stock || 0;
                        const status = item.adminStatus || item.admin_status || 'approved';

                        return (
                            <div key={item.id} className="merch-card">
                                <div className="merch-image-wrapper">
                                    {img ? (
                                        <img src={img} alt={item.name} className="merch-img" />
                                    ) : (
                                        <div className="merch-no-img">
                                            <ImageIcon size={32} />
                                            <span>Sin Imagen</span>
                                        </div>
                                    )}

                                    {item.category && (
                                        <span className="merch-badge-category">
                                            {item.category}
                                        </span>
                                    )}

                                    <span className={`merch-badge-status ${
                                        status === 'approved' ? 'merch-badge-approved' :
                                        status === 'pending_review' ? 'merch-badge-pending' : 'merch-badge-rejected'
                                    }`}>
                                        {status === 'approved' ? 'Publicado' :
                                         status === 'pending_review' ? 'En Revisión' : 'Rechazado'}
                                    </span>
                                </div>

                                <div className="merch-body">
                                    <h4 className="merch-title">{item.name}</h4>
                                    <p className="merch-desc">{item.description}</p>
                                    
                                    <div className="merch-meta">
                                        <span className="merch-price">${price}</span>
                                        <span className="merch-stock">Stock: {stock} uds</span>
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
            )}

            {/* Modal: Añadir o Editar Producto */}
            <Modal 
                isOpen={showModal} 
                onClose={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setFormData({ name: '', description: '', price: '', stock: '', category: '', image_url: '', variant_id: '', sku: '' });
                }} 
                title={editingId ? "Editar Producto de Mercancía" : "Añadir Nuevo Producto"} 
                size="medium"
            >
                <form onSubmit={handleCreateMerch} className="merch-form">
                    <div className="merch-form-group">
                        <label className="merch-form-label">Nombre del Producto</label>
                        <input 
                            type="text"
                            className="merch-form-input"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            placeholder="Ej. Sudadera Oficial Vive Latino 2026"
                            required
                        />
                    </div>

                    <div className="merch-form-group">
                        <label className="merch-form-label">Descripción Detallada</label>
                        <textarea 
                            className="merch-form-textarea"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            placeholder="Describe el material, especificaciones y detalles del producto..."
                            required
                        />
                    </div>

                    <div className="merch-form-row">
                        <div className="merch-form-group">
                            <label className="merch-form-label">Precio Unitario ($ MXN)</label>
                            <input 
                                type="number" 
                                className="merch-form-input"
                                min="0" 
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({...formData, price: e.target.value})}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="merch-form-group">
                            <label className="merch-form-label">Stock Inicial</label>
                            <input 
                                type="number" 
                                className="merch-form-input"
                                min="1"
                                value={formData.stock}
                                onChange={(e) => setFormData({...formData, stock: e.target.value})}
                                placeholder="100"
                                required
                            />
                        </div>
                    </div>

                    <div className="merch-form-group">
                        <label className="merch-form-label">Categoría</label>
                        <input 
                            type="text"
                            className="merch-form-input"
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                            placeholder="Playeras, Sudaderas, Vasos, Accesorios, etc."
                        />
                    </div>

                    <div className="merch-form-group">
                        <label className="merch-form-label">Imagen del Producto</label>
                        <div className="merch-upload-toggle">
                            <button
                                type="button"
                                className={`merch-toggle-btn ${uploadType === 'file' ? 'active' : ''}`}
                                onClick={() => setUploadType('file')}
                            >
                                <UploadCloud size={13} style={{ display: 'inline', marginRight: '4px' }} />
                                Subir Archivo
                            </button>
                            <button
                                type="button"
                                className={`merch-toggle-btn ${uploadType === 'url' ? 'active' : ''}`}
                                onClick={() => setUploadType('url')}
                            >
                                <LinkIcon size={13} style={{ display: 'inline', marginRight: '4px' }} />
                                Enlace URL
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
                                <UploadCloud size={32} style={{ color: '#818cf8', margin: '0 auto 0.5rem' }} />
                                <span className="merch-dropzone-prompt">
                                    {uploading ? 'Subiendo imagen a la nube...' : formData.image_url ? 'Cambiar imagen seleccionada' : 'Haz clic para seleccionar una imagen'}
                                </span>
                                <span className="merch-dropzone-hint">
                                    Formatos soportados: JPG, PNG, WEBP (hasta 5MB)
                                </span>

                                {formData.image_url && (
                                    <div className="merch-preview-pill">
                                        <img src={formData.image_url} alt="Vista previa" className="merch-preview-img" />
                                        <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>
                                            Imagen cargada correctamente
                                        </span>
                                    </div>
                                )}
                            </label>
                        ) : (
                            <input 
                                type="url"
                                className="merch-form-input"
                                value={formData.image_url}
                                onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                                placeholder="https://ejemplo.com/producto.jpg"
                                required
                            />
                        )}
                    </div>

                    <div className="merch-form-actions">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => {
                                setShowModal(false);
                                setEditingId(null);
                                setFormData({ name: '', description: '', price: '', stock: '', category: '', image_url: '', variant_id: '', sku: '' });
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" disabled={submitting || uploading}>
                            {submitting ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Añadir Producto'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default MerchandisePanel;
