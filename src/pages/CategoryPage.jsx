import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import MaterialCard from '../components/MaterialCard';

// Predefined lists to help Admins add items quickly
const PREDEFINED_ITEMS = {
  'Carpentry': [
    '12MM PLY 8x4 (Ecotec/MR)',
    '18MM Ply 8X4',
    '25MM BOARD 8x4 (Ecotec/MR)',
    'Beeding 2nd 35X6',
    'Beeding 2nd 35x10',
    'FEVICOL SH',
    'HITEX',
    'Abrow Tape',
    'Nail 14 no. 2\'',
    'Nail 14 no. 1.5',
    'Nail 17no. 1\' HL',
    'Nail 19 NO. 1\' HL',
    '2 Nos Tie Rod Wiser Nut Board 3.5"',
    'Nail 17 no. 1.25',
    '75/10 screw',
    '60/10 screw',
    '32/6 screw',
    '50/6 screw',
    '25/6 screw',
    'gulli/gujji',
    'Aluminium Section 2 1/2\'x 1 1/2\'',
    'door vertical 10ft',
    'Door Bottom',
    'Clip',
    'Angle',
    'Rubber',
    'Clear silicon',
    'patam section 7ft',
    'patam section 4ft',
    'tie rod'
  ],
  'False Ceiling': [
    'Gypsum Board (Saint Gobian/Boral)',
    'Stud 12\'',
    'Floor 12\'',
    '1\' Black Screw',
    'Jointing Tape',
    'PVC Grip',
    'Wooden Screw 1.5"'
  ],
  'Painting': [
    'Putty',
    'Acrylic Putty',
    'Metal Primer Asian',
    'Asian Wall Primer Water Base',
    'Asian Primium Base',
    'Primium Wall Blue Colour 7325',
    'Shutter/Grill Oxford Blue 0119',
    'Counter Grill Asian White Paint',
    'Sand Paper 150 no.',
    'Roll Paper 100 n0.',
    'Cloth',
    'Brown Paint 100 ml',
    'Tarpin',
    'Thinner'
  ],
  'Modular': [
    'Manager Table',
    'Executive Table',
    'Cash/Gold Counter',
    'Pedestal Wooden',
    'Printer Table',
    'Laminate',
    'Ozone Handle',
    'Ozone Door Closer',
    'Godrej All Door Lock',
    'Godrej Inside/Outside Latch',
    'Shutter Pad Lock',
    'File Candy',
    'Acrylic Frame',
    'Folding Bracket',
    '5\' SS Hinge',
    'Stopper',
    'Lining Film',
    '2\' Mirror Screw',
    '32/8 Star Screw',
    'Half Inch Black Screw',
    '1.5 Black Screw',
    '19/8 Star screw',
    'White Board',
    'Notice Board Blue',
    'MDF Particle Board (Chair Band)',
    'Cylindrical Lock',
    '6\' SS Handal'
  ],
  'Electrical': [
    'TPN 40 Amp 4 pole L & T',
    '63 Amp Busbar',
    'Singal Pole MCB 10 Amp L & T',
    'Single Pole 16 Amp MCB L & T',
    '25 Amp Dp L & T',
    '40 amp RCCB 4 pole With Box L & T',
    '4 Way SPN Box Double Door L & T',
    '2 Way DP MS Box SPN Single Door',
    '8 Way SPN Box Double Door L & T',
    '6 Square mm Copper Luxe Ring Type',
    '6 Square mm Copper Luxe Pin Type',
    '1 Sqaure mm Wire 90 Mtr Policap',
    '1.5 Square mm Wire 90 Mtr Policap',
    '2.5 Square mm Wire Policap',
    '4 mm Wire Policap ( 10 mtr red + 10mtr black )',
    'Celling Rose (anchor )',
    'D Hook',
    '16 Amp Switch Grate White',
    '16 amp Socket Grate White',
    '6 Amp Switch Grate White',
    '6 Amp Socket Grate White',
    'bell switch ( switch type ) Grate White',
    '16 Amp Top Anchor',
    '5 Amp Top Anchor',
    '12 Module PVC Box Local',
    '12 Module PVC Plate Local',
    '6 Module PVC Box Local',
    '6 Module PVC Plate Local',
    '8 Module PVC Box Local',
    '8 Module PVC Plate Grate White',
    '3 Module PVC Box Grate White',
    '3 Module PVC Plate Grate White',
    '2 Module PVC Box Grate White',
    '2 Module PVC Plate Grate White',
    '1 module plate Grate White',
    'calling bell ding dong Anchor',
    'Copper Bolt',
    '25 Amp Switch Type MCB Grate White',
    'Fan Regulator Switch Type Grate White',
    'Dummy Plate Grate White',
    'Tape',
    'PVC Grip ( hariom )',
    'Earthing Electrod 2 mtr 50 mm Dia',
    'Chemical Bag 25 kg',
    '20mmChaina Clip',
    'Chaina Clip 25 mm',
    '2\' Tubelight philips',
    '4\' Tubelight philips',
    'PVC Conduit Pipe (anchor, policap , finolex)',
    'PVC Band 1" (anchor, policap , finolex)',
    'PVC Junction Box (anchor, policap , finolex)',
    'PVC Cassing 1"',
    'Celling Fan 48" Cromton',
    'Exhaust Fan 9" metal Cromton',
    'Exhaust Fan 12" (PVC 300 mm ) Bajaj',
    '10 Sq mm 4 core armet cable',
    '10 mm cooper taar (earthing )'
  ],
  'Civil Work': [
    'bricks',
    'sand',
    'cement',
    'aggregate',
    'steel rod',
    'Steel 8mm',
    'Steel 10mm',
    'Steel 12mm',
    'Steel 16mm'
  ]
};

const CategoryPage = ({ category }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [materials, setMaterials] = useState([]);
  const [sites, setSites] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedSite, setSelectedSite] = useState(isAdmin ? '' : user?.assignedSite || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Add/Edit Form states
  const [formName, setFormName] = useState('');
  const [formCustomName, setFormCustomName] = useState('');
  const [formSite, setFormSite] = useState('');
  const [formQty, setFormQty] = useState('0');
  const [formUnit, setFormUnit] = useState('');
  const [editingMaterial, setEditingMaterial] = useState(null);

  // Sites only need to be loaded once — refetching them on every category or
  // site change was an extra round trip per navigation.
  useEffect(() => {
    fetchSites();
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [category, selectedSite]);

  const fetchSites = async () => {
    if (!isAdmin) return;
    try {
      const data = await API.getSites();
      setSites(data);
      if (data.length > 0 && !selectedSite) {
        setSelectedSite(data[0].name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMaterials = async () => {
    if (isAdmin && !selectedSite) return;
    setLoading(true);
    try {
      const params = { category };
      if (selectedSite) {
        params.site = selectedSite;
      } else if (!isAdmin && user?.assignedSite) {
        params.site = user.assignedSite;
      }
      
      const data = await API.getMaterials(params);
      setMaterials(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch inventory.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = async (id, change, newValue, unit) => {
    try {
      const updated = await API.adjustQuantity(id, change, newValue, unit);
      setMaterials(prev => prev.map(m => m._id === id
        ? { ...m, quantity: updated.material.quantity, unit: updated.material.unit ?? m.unit }
        : m
      ));
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating quantity');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const finalName = formName === 'other' ? formCustomName : formName;
    const qty = parseFloat(formQty);
    if (!finalName || !formSite || isNaN(qty) || qty < 0) {
      alert('Please fill out all fields correctly.');
      return;
    }

    try {
      const result = await API.addMaterial({
        name: finalName,
        category,
        site: formSite,
        quantity: qty,
        unit: formUnit.trim()
      });
      
      // Close modal and refresh list
      setShowAddModal(false);
      resetForm();
      fetchMaterials();
      alert(result.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add item');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(formQty);
    if (!formName || !formSite || isNaN(qty) || qty < 0) {
      alert('Please fill out all fields.');
      return;
    }

    try {
      await API.editMaterial(editingMaterial._id, {
        name: formName,
        site: formSite,
        quantity: qty,
        unit: formUnit.trim()
      });
      setShowEditModal(false);
      resetForm();
      fetchMaterials();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to edit item');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this material?')) return;
    try {
      await API.deleteMaterial(id);
      setMaterials(prev => prev.filter(m => m._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete item');
    }
  };

  const openEditModal = (material) => {
    setEditingMaterial(material);
    setFormName(material.name);
    setFormSite(material.site);
    setFormQty(String(material.quantity ?? 0));
    setFormUnit(material.unit || '');
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormCustomName('');
    setFormSite('');
    setFormQty('0');
    setFormUnit('');
    setEditingMaterial(null);
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAdmin && !user?.assignedSite) {
    return (
      <div className="badge badge-error" style={{ width: '100%', padding: '15px', borderRadius: 'var(--radius-md)', textTransform: 'none', fontSize: '14px' }}>
        ⚠️ You are not assigned to any project site. Please ask the Admin to assign you a site.
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filters */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '16px', flexGrow: 1, maxWidth: '600px' }}>
          <input
            type="text"
            className="form-input"
            style={{ marginBottom: 0 }}
            placeholder={`🔍 Search in ${category}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isAdmin && (
            <select
              className="form-input"
              style={{ marginBottom: 0, minWidth: '150px' }}
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
            >
              {sites.map(s => (
                <option key={s._id} value={s.name}>{s.name}</option>
              ))}
            </select>
          )}
        </div>
        
        {isAdmin && (
          <button 
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              if (sites.length > 0) setFormSite(sites[0].name);
              const list = PREDEFINED_ITEMS[category];
              if (list && list.length > 0) setFormName(list[0]);
              setShowAddModal(true);
            }}
          >
            ➕ Add Material
          </button>
        )}
      </div>

      {error && (
        <div className="badge badge-error" style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '20px', textTransform: 'none' }}>
          {error}
        </div>
      )}

      {/* Materials List */}
      {loading ? (
        <div className="flex-center" style={{ minHeight: '200px' }}>Loading materials...</div>
      ) : filteredMaterials.length > 0 ? (
        <div className="material-scroll-container">
          <div className="grid-cols-3">
            {filteredMaterials.map(m => (
              <MaterialCard
                key={m._id}
                material={m}
                onQtyChange={handleQtyChange}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card flex-center" style={{ minHeight: '200px', flexDirection: 'column', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '32px', marginBottom: '10px' }}>📦</span>
          <p>No materials found in this category.</p>
        </div>
      )}

      {/* Add Material Modal Overlay */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', margin: 'auto', borderRadius: 'var(--radius-lg)', padding: '30px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>Add Material Item</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label className="form-label">Material Name</label>
                <select 
                  className="form-input" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)}
                >
                  {PREDEFINED_ITEMS[category]?.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  <option value="other">-- Custom / Other --</option>
                </select>
              </div>

              {formName === 'other' && (
                <div className="form-group">
                  <label className="form-label">Enter Custom Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Premium Teak Wood"
                    value={formCustomName}
                    onChange={(e) => setFormCustomName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Project Site</label>
                <select
                  className="form-input"
                  value={formSite}
                  onChange={(e) => setFormSite(e.target.value)}
                >
                  {sites.map(s => (
                    <option key={s._id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="qty-unit-row">
                <div className="form-group">
                  <label className="form-label">Initial Quantity</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="form-input"
                    placeholder="e.g. 1250 or 12.5"
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="kg, nos, sq ft…"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    maxLength={20}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Material Modal Overlay */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', margin: 'auto', borderRadius: 'var(--radius-lg)', padding: '30px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>Edit Material Item</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Material Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Project Site</label>
                <select
                  className="form-input"
                  value={formSite}
                  onChange={(e) => setFormSite(e.target.value)}
                >
                  {/* Lock site in edit for safety, or allow changing it */}
                  <option value={formSite}>{formSite}</option>
                  {sites.filter(s => s.name !== formSite).map(s => (
                    <option key={s._id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="qty-unit-row">
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="form-input"
                    placeholder="e.g. 1250 or 12.5"
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="kg, nos, sq ft…"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    maxLength={20}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
