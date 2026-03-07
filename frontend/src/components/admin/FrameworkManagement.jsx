import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, FileUp, Download, ChevronDown, ChevronUp, List, Layers } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import * as frameworkAPI from '../../api/framework';

const FrameworkManagement = () => {
  const [activeTab, setActiveTab] = useState('pillars');
  const [pillars, setPillars] = useState([]);
  const [maturityLevels, setMaturityLevels] = useState([]);
  const [phases, setPhases] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [formData, setFormData] = useState({});
  
  // Steps management state
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [phaseSteps, setPhaseSteps] = useState({});
  const [editingStep, setEditingStep] = useState(null);
  const [stepFormData, setStepFormData] = useState({});
  
  const { showToast } = useToast();

  // ─── Load Data ────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'pillars':
          const pillarsRes = await frameworkAPI.getAllPillarsAdmin();
          setPillars(pillarsRes.data || []);
          break;
        case 'maturity':
          const maturityRes = await frameworkAPI.getAllMaturityLevelsAdmin();
          setMaturityLevels(maturityRes.data || []);
          break;
        case 'phases':
          const phasesRes = await frameworkAPI.getAllPhasesAdmin();
          setPhases(phasesRes.data || []);
          break;
        case 'templates':
          const templatesRes = await frameworkAPI.getAllAuditTemplatesAdmin();
          setTemplates(templatesRes.data || []);
          break;
      }
    } catch (error) {
      showToast('Failed to load framework data', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ─── CRUD Operations ──────────────────────────────────────────────────────────

  const handleCreate = () => {
    setEditMode('new');
    setFormData(getEmptyFormData());
  };

  const handleEdit = (item) => {
    setEditMode(item.id);
    setFormData(item);
  };

  const handleCancel = () => {
    setEditMode(null);
    setFormData({});
  };

  const handleSave = async () => {
    try {
      if (editMode === 'new') {
        await createItem();
      } else {
        await updateItem();
      }
      await loadData();
      setEditMode(null);
      setFormData({});
      showToast('Saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save', 'error');
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      switch (activeTab) {
        case 'pillars':
          await frameworkAPI.deletePillar(id);
          break;
        case 'maturity':
          await frameworkAPI.deleteMaturityLevel(id);
          break;
        case 'phases':
          await frameworkAPI.deletePhase(id);
          break;
        case 'templates':
          await frameworkAPI.deleteAuditTemplate(id);
          break;
      }
      await loadData();
      showToast('Deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete', 'error');
      console.error(error);
    }
  };

  const createItem = async () => {
    switch (activeTab) {
      case 'pillars':
        await frameworkAPI.createPillar(formData);
        break;
      case 'maturity':
        await frameworkAPI.createMaturityLevel(formData);
        break;
      case 'phases':
        await frameworkAPI.createPhase(formData);
        break;
      case 'templates':
        await frameworkAPI.createAuditTemplate(formData, formData.file);
        break;
    }
  };

  const updateItem = async () => {
    switch (activeTab) {
      case 'pillars':
        await frameworkAPI.updatePillar(editMode, formData);
        break;
      case 'maturity':
        await frameworkAPI.updateMaturityLevel(editMode, formData);
        break;
      case 'phases':
        await frameworkAPI.updatePhase(editMode, formData);
        break;
      case 'templates':
        await frameworkAPI.updateAuditTemplate(editMode, formData, formData.file);
        break;
    }
  };

  const getEmptyFormData = () => {
    switch (activeTab) {
      case 'pillars':
        return { title: '', description: '', tags: [], insight: '', displayOrder: 0, status: 'draft' };
      case 'maturity':
        return { level: 1, name: '', color: '#64748B', lightBg: '#F8FAFC', borderColor: '#E2E8F0', description: '', characteristics: [], actions: [], percentage: 25, status: 'draft' };
      case 'phases':
        return { phaseNumber: 1, phaseLabel: 'Phase 1', title: '', duration: '', icon: '🏛️', displayOrder: 0, status: 'draft' };
      case 'templates':
        return { templateId: '', title: '', category: '', format: '', description: '', fields: [], displayOrder: 0, status: 'draft' };
      default:
        return {};
    }
  };

  // ─── Steps Management Functions ───────────────────────────────────────────────

  const togglePhaseExpansion = async (phaseId) => {
    if (expandedPhase === phaseId) {
      setExpandedPhase(null);
      setEditingStep(null);
      setStepFormData({});
    } else {
      setExpandedPhase(phaseId);
      await loadStepsForPhase(phaseId);
    }
  };

  const loadStepsForPhase = async (phaseId) => {
    try {
      const response = await frameworkAPI.getStepsByPhase(phaseId);
      setPhaseSteps(prev => ({ ...prev, [phaseId]: response.data || [] }));
    } catch (error) {
      showToast('Failed to load steps', 'error');
      console.error(error);
    }
  };

  const handleAddStep = (phaseId) => {
    setEditingStep('new');
    setStepFormData({
      phase_id: phaseId,
      step_number: '',
      title: '',
      description: '',
      display_order: (phaseSteps[phaseId]?.length || 0) + 1,
      status: 'draft'
    });
  };

  const handleEditStep = (step) => {
    setEditingStep(step.id);
    setStepFormData(step);
  };

  const handleCancelStep = () => {
    setEditingStep(null);
    setStepFormData({});
  };

  const handleSaveStep = async () => {
    try {
      if (editingStep === 'new') {
        await frameworkAPI.createStep(stepFormData);
        showToast('Step created successfully', 'success');
      } else {
        await frameworkAPI.updateStep(editingStep, stepFormData);
        showToast('Step updated successfully', 'success');
      }
      await loadStepsForPhase(stepFormData.phase_id);
      setEditingStep(null);
      setStepFormData({});
    } catch (error) {
      showToast('Failed to save step', 'error');
      console.error(error);
    }
  };

  const handleDeleteStep = async (stepId, phaseId) => {
    if (!window.confirm('Are you sure you want to delete this step?')) return;
    try {
      await frameworkAPI.deleteStep(stepId);
      showToast('Step deleted successfully', 'success');
      await loadStepsForPhase(phaseId);
    } catch (error) {
      showToast('Failed to delete step', 'error');
      console.error(error);
    }
  };

  // ─── Render Functions ─────────────────────────────────────────────────────────

  const renderPillars = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {pillars.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '0.875rem', background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px' }}>No pillars yet — click "Add New" to create one.</div>}
      {pillars.map((pillar) => (
        <div key={pillar.id} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{pillar.title}</h3>
                  <p style={{ color: '#6B7280', marginBottom: '12px' }}>{pillar.description}</p>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    {(pillar.tags || []).map((tag, idx) => (
                      <span key={idx} style={{ background: '#EFF6FF', color: '#003366', padding: '4px 12px', borderRadius: '12px', fontSize: '12px' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontStyle: 'italic', color: '#059669', fontSize: '14px' }}>💡 {pillar.insight}</p>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '13px', color: '#6B7280' }}>
                    <span>Order: {pillar.display_order}</span>
                    <span>Status: <span style={{ color: pillar.status === 'published' ? '#059669' : '#D97706', fontWeight: '500' }}>{pillar.status}</span></span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleEdit(pillar)} style={{ padding: '8px', background: '#EFF6FF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    <Edit2 size={16} color="#003366" />
                  </button>
                  <button onClick={() => handleDelete(pillar.id)} style={{ padding: '8px', background: '#FEF2F2', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    <Trash2 size={16} color="#DC2626" />
                  </button>
                </div>
              </div>
        </div>
      ))}
    </div>
  );

  const renderMaturityLevels = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {maturityLevels.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '0.875rem', background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px' }}>No maturity levels yet.</div>}
      {maturityLevels.map((level) => (
        <div key={level.id} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px', fontWeight: '700', color: level.color }}>Level {level.level}</span>
                    <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{level.name}</h3>
                    <div style={{ width: '20px', height: '20px', background: level.color, borderRadius: '4px' }}></div>
                  </div>
                  <p style={{ color: '#6B7280', marginBottom: '12px' }}>{level.description}</p>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ fontSize: '14px' }}>Characteristics:</strong>
                    <ul style={{ marginTop: '4px', paddingLeft: '20px', fontSize: '14px', color: '#4B5563' }}>
                      {(level.characteristics || []).map((char, idx) => <li key={idx}>{char}</li>)}
                    </ul>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '13px', color: '#6B7280' }}>
                    <span>Progress: {level.percentage}%</span>
                    <span>Status: <span style={{ color: level.status === 'published' ? '#059669' : '#D97706', fontWeight: '500' }}>{level.status}</span></span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleEdit(level)} style={{ padding: '8px', background: '#EFF6FF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    <Edit2 size={16} color="#003366" />
                  </button>
                  <button onClick={() => handleDelete(level.id)} style={{ padding: '8px', background: '#FEF2F2', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    <Trash2 size={16} color="#DC2626" />
                  </button>
                </div>
              </div>
        </div>
      ))}
    </div>
  );

  const renderPhases = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {phases.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '0.875rem', background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px' }}>No phases yet.</div>}
      {phases.map((phase) => (
        <div key={phase.id} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{phase.icon}</span>
                  <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{phase.phase_label}: {phase.title}</h3>
                </div>
                <p style={{ color: '#6B7280', marginBottom: '8px' }}>Duration: {phase.duration}</p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6B7280' }}>
                  <span>Order: {phase.display_order}</span>
                  <span>Status: <span style={{ color: phase.status === 'published' ? '#059669' : '#D97706', fontWeight: '500' }}>{phase.status}</span></span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => togglePhaseExpansion(phase.id)} 
                  style={{ 
                    padding: '8px 12px', 
                    background: expandedPhase === phase.id ? '#003366' : '#F3F4F6', 
                    color: expandedPhase === phase.id ? 'white' : '#003366',
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  <List size={14} />
                  Steps
                  {expandedPhase === phase.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button onClick={() => handleEdit(phase)} style={{ padding: '8px', background: '#EFF6FF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  <Edit2 size={16} color="#003366" />
                </button>
                <button onClick={() => handleDelete(phase.id)} style={{ padding: '8px', background: '#FEF2F2', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  <Trash2 size={16} color="#DC2626" />
                </button>
              </div>
            </div>
          </div>

          {/* Steps Section */}
          {expandedPhase === phase.id && (
            <div style={{ borderTop: '1px solid #E5E7EB', background: '#F9FAFB', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>Implementation Steps</h4>
                <button
                  onClick={() => handleAddStep(phase.id)}
                  disabled={editingStep !== null}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: editingStep !== null ? '#D1D5DB' : '#003366',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: editingStep !== null ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  <Plus size={14} /> Add Step
                </button>
              </div>

              {/* Step Form */}
              {editingStep && stepFormData.phase_id === phase.id && (
                <div style={{ background: 'white', border: '2px solid #003366', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                    {editingStep === 'new' ? 'Add New Step' : 'Edit Step'}
                  </h5>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Step Number</label>
                      <input
                        type="text"
                        value={stepFormData.step_number || ''}
                        onChange={(e) => setStepFormData({ ...stepFormData, step_number: e.target.value })}
                        placeholder="e.g., 1.1, 1.2"
                        style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Title</label>
                      <input
                        type="text"
                        value={stepFormData.title || ''}
                        onChange={(e) => setStepFormData({ ...stepFormData, title: e.target.value })}
                        placeholder="Step title"
                        style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Description</label>
                      <textarea
                        value={stepFormData.description || ''}
                        onChange={(e) => setStepFormData({ ...stepFormData, description: e.target.value })}
                        placeholder="Step description"
                        rows={3}
                        style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Display Order</label>
                        <input
                          type="number"
                          value={stepFormData.display_order || 0}
                          onChange={(e) => setStepFormData({ ...stepFormData, display_order: parseInt(e.target.value) })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Status</label>
                        <select
                          value={stepFormData.status || 'draft'}
                          onChange={(e) => setStepFormData({ ...stepFormData, status: e.target.value })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        onClick={handleSaveStep}
                        style={{ flex: 1, padding: '8px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                      >
                        <Save size={16} style={{ display: 'inline', marginRight: '6px' }} />
                        Save Step
                      </button>
                      <button
                        onClick={handleCancelStep}
                        style={{ flex: 1, padding: '8px', background: '#6B7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                      >
                        <X size={16} style={{ display: 'inline', marginRight: '6px' }} />
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Steps List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {phaseSteps[phase.id]?.length > 0 ? (
                  phaseSteps[phase.id].map((step) => (
                    <div key={step.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#003366', background: '#EFF6FF', padding: '2px 8px', borderRadius: '4px' }}>
                              {step.step_number}
                            </span>
                            <h5 style={{ fontSize: '14px', fontWeight: '600' }}>{step.title}</h5>
                          </div>
                          <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '6px' }}>{step.description}</p>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#9CA3AF' }}>
                            <span>Order: {step.display_order}</span>
                            <span>Status: <span style={{ color: step.status === 'published' ? '#059669' : '#D97706' }}>{step.status}</span></span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            onClick={() => handleEditStep(step)} 
                            disabled={editingStep !== null}
                            style={{ padding: '6px', background: editingStep !== null ? '#F3F4F6' : '#EFF6FF', border: 'none', borderRadius: '4px', cursor: editingStep !== null ? 'not-allowed' : 'pointer' }}
                          >
                            <Edit2 size={14} color={editingStep !== null ? '#9CA3AF' : '#003366'} />
                          </button>
                          <button 
                            onClick={() => handleDeleteStep(step.id, phase.id)} 
                            disabled={editingStep !== null}
                            style={{ padding: '6px', background: editingStep !== null ? '#F3F4F6' : '#FEF2F2', border: 'none', borderRadius: '4px', cursor: editingStep !== null ? 'not-allowed' : 'pointer' }}
                          >
                            <Trash2 size={14} color={editingStep !== null ? '#9CA3AF' : '#DC2626'} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF', fontSize: '14px' }}>
                    No steps added yet. Click "Add Step" to create one.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderTemplates = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {templates.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '0.875rem', background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px' }}>No templates yet.</div>}
      {templates.map((template) => (
        <div key={template.id} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ background: '#003366', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                  {template.template_id}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{template.title}</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <span style={{ background: '#F3F4F6', padding: '4px 12px', borderRadius: '12px', fontSize: '13px' }}>{template.category}</span>
                <span style={{ background: '#F3F4F6', padding: '4px 12px', borderRadius: '12px', fontSize: '13px' }}>{template.format}</span>
              </div>
              <p style={{ color: '#6B7280', marginBottom: '8px', fontSize: '14px' }}>{template.description}</p>
              {template.file_url && (
                <a href={`${import.meta.env.VITE_API_URL}${template.file_url}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#003366', fontSize: '14px', textDecoration: 'none' }}>
                  <Download size={14} /> Download Template ({template.file_name})
                </a>
              )}
              <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '13px', color: '#6B7280' }}>
                <span>Order: {template.display_order}</span>
                <span>Status: <span style={{ color: template.status === 'published' ? '#059669' : '#D97706', fontWeight: '500' }}>{template.status}</span></span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleEdit(template)} style={{ padding: '8px', background: '#EFF6FF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                <Edit2 size={16} color="#003366" />
              </button>
              <button onClick={() => handleDelete(template.id)} style={{ padding: '8px', background: '#FEF2F2', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                <Trash2 size={16} color="#DC2626" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Main Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '2px solid #F1F5F9' }}>
        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', background: '#001f3f', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,31,63,0.18)', flexShrink: 0 }}>
            <Layers size={18} color="#60A5FA" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0F172A' }}>Framework Content</h2>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>Manage pillars, maturity levels, phases and templates</p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={editMode !== null}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: editMode !== null ? '#CBD5E1' : '#001f3f', color: 'white', border: '1px solid #003060', padding: '8px 16px', borderRadius: '7px', fontWeight: '600', fontSize: '0.8rem', cursor: editMode !== null ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: editMode !== null ? 0.6 : 1 }}
        >
          <Plus size={15} /> Add New
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #F1F5F9' }}>
        {[
          { key: 'pillars', label: 'Core Pillars' },
          { key: 'maturity', label: 'Maturity Levels' },
          { key: 'phases', label: 'Implementation Phases' },
          { key: 'templates', label: 'Audit Templates' }
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setEditMode(null); setFormData({}); }}
              style={{ padding: '0.7rem 1.1rem', background: 'none', border: 'none', borderBottom: active ? '2px solid #003366' : '2px solid transparent', marginBottom: '-2px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: active ? '700' : '500', color: active ? '#003366' : '#64748B', transition: 'all 0.15s', whiteSpace: 'nowrap', outline: 'none' }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* New Item Form */}
      {editMode === 'new' && (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ margin: '0 0 1rem', fontWeight: '700', fontSize: '0.92rem', color: '#0F172A' }}>Create New {getTabLabel()}</p>
          {activeTab === 'pillars' && <PillarForm data={formData} onChange={setFormData} onSave={handleSave} onCancel={handleCancel} />}
          {activeTab === 'maturity' && <MaturityLevelForm data={formData} onChange={setFormData} onSave={handleSave} onCancel={handleCancel} />}
          {activeTab === 'phases' && <PhaseForm data={formData} onChange={setFormData} onSave={handleSave} onCancel={handleCancel} />}
          {activeTab === 'templates' && <TemplateForm data={formData} onChange={setFormData} onSave={handleSave} onCancel={handleCancel} />}
        </div>
      )}

      {/* Edit Item Form */}
      {editMode !== null && editMode !== 'new' && (
        <div style={{ background: 'white', border: '2px solid #003366', borderRadius: '10px', padding: '1.25rem 1.5rem', boxShadow: '0 0 0 4px rgba(0,51,102,0.06)' }}>
          <p style={{ margin: '0 0 1rem', fontWeight: '700', fontSize: '0.92rem', color: '#003366' }}>Edit {getTabLabel()}</p>
          {activeTab === 'pillars' && <PillarForm data={formData} onChange={setFormData} onSave={handleSave} onCancel={handleCancel} />}
          {activeTab === 'maturity' && <MaturityLevelForm data={formData} onChange={setFormData} onSave={handleSave} onCancel={handleCancel} />}
          {activeTab === 'phases' && <PhaseForm data={formData} onChange={setFormData} onSave={handleSave} onCancel={handleCancel} />}
          {activeTab === 'templates' && <TemplateForm data={formData} onChange={setFormData} onSave={handleSave} onCancel={handleCancel} />}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #E2E8F0', borderTopColor: '#003366', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <p style={{ marginTop: '12px', color: '#64748B', fontSize: '0.875rem' }}>Loading…</p>
        </div>
      ) : (
        <>
          {activeTab === 'pillars' && renderPillars()}
          {activeTab === 'maturity' && renderMaturityLevels()}
          {activeTab === 'phases' && renderPhases()}
          {activeTab === 'templates' && renderTemplates()}
        </>
      )}
    </div>
  );
  
  function getTabLabel() {
    const labels = { pillars: 'Pillar', maturity: 'Maturity Level', phases: 'Phase', templates: 'Template' };
    return labels[activeTab] || 'Item';
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Form Components (Simplified versions - expand as needed)
// ═══════════════════════════════════════════════════════════════════════════════

const PillarForm = ({ data, onChange, onSave, onCancel }) => (
  <FormWrapper>
    <Input label="Title" value={data.title} onChange={(v) => onChange({ ...data, title: v })} />
    <Textarea label="Description" value={data.description} onChange={(v) => onChange({ ...data, description: v })} rows={3} />
    <Input label="Insight" value={data.insight} onChange={(v) => onChange({ ...data, insight: v })} />
    <Input label="Tags (comma-separated)" value={(data.tags || []).join(', ')} onChange={(v) => onChange({ ...data, tags: v.split(',').map(t => t.trim()) })} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <Input label="Display Order" type="number" value={data.displayOrder} onChange={(v) => onChange({ ...data, displayOrder: parseInt(v) })} />
      <Select label="Status" value={data.status} onChange={(v) => onChange({ ...data, status: v })} options={['draft', 'published', 'archived']} />
    </div>
    <FormActions onSave={onSave} onCancel={onCancel} />
  </FormWrapper>
);

const MaturityLevelForm = ({ data, onChange, onSave, onCancel }) => (
  <FormWrapper>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <Input label="Level Number" type="number" value={data.level} onChange={(v) => onChange({ ...data, level: parseInt(v) })} />
      <Input label="Level Name" value={data.name} onChange={(v) => onChange({ ...data, name: v })} />
    </div>
    <Textarea label="Description" value={data.description} onChange={(v) => onChange({ ...data, description: v })} rows={2} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
      <Input label="Color (hex)" value={data.color} onChange={(v) => onChange({ ...data, color: v })} />
      <Input label="Light BG (hex)" value={data.lightBg} onChange={(v) => onChange({ ...data, lightBg: v })} />
      <Input label="Border Color (hex)" value={data.borderColor} onChange={(v) => onChange({ ...data, borderColor: v })} />
    </div>
    <Textarea label="Characteristics (one per line)" value={(data.characteristics || []).join('\n')} onChange={(v) => onChange({ ...data, characteristics: v.split('\n').filter(Boolean) })} rows={4} />
    <Textarea label="Actions (one per line)" value={(data.actions || []).join('\n')} onChange={(v) => onChange({ ...data, actions: v.split('\n').filter(Boolean) })} rows={3} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <Input label="Percentage" type="number" value={data.percentage} onChange={(v) => onChange({ ...data, percentage: parseInt(v) })} />
      <Select label="Status" value={data.status} onChange={(v) => onChange({ ...data, status: v })} options={['draft', 'published', 'archived']} />
    </div>
    <FormActions onSave={onSave} onCancel={onCancel} />
  </FormWrapper>
);

const PhaseForm = ({ data, onChange, onSave, onCancel }) => (
  <FormWrapper>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
      <Input label="Phase Number" type="number" value={data.phaseNumber} onChange={(v) => onChange({ ...data, phaseNumber: parseInt(v) })} />
      <Input label="Phase Label" value={data.phaseLabel} onChange={(v) => onChange({ ...data, phaseLabel: v })} placeholder="Phase 1" />
      <Input label="Icon (emoji)" value={data.icon} onChange={(v) => onChange({ ...data, icon: v })} />
    </div>
    <Input label="Title" value={data.title} onChange={(v) => onChange({ ...data, title: v })} />
    <Input label="Duration" value={data.duration} onChange={(v) => onChange({ ...data, duration: v })} placeholder="0–3 months" />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <Input label="Display Order" type="number" value={data.displayOrder} onChange={(v) => onChange({ ...data, displayOrder: parseInt(v) })} />
      <Select label="Status" value={data.status} onChange={(v) => onChange({ ...data, status: v })} options={['draft', 'published', 'archived']} />
    </div>
    <FormActions onSave={onSave} onCancel={onCancel} />
  </FormWrapper>
);

const TemplateForm = ({ data, onChange, onSave, onCancel }) => (
  <FormWrapper>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <Input label="Template ID" value={data.templateId} onChange={(v) => onChange({ ...data, templateId: v })} placeholder="T-01" />
      <Input label="Category" value={data.category} onChange={(v) => onChange({ ...data, category: v })} />
    </div>
    <Input label="Title" value={data.title} onChange={(v) => onChange({ ...data, title: v })} />
    <Input label="Format" value={data.format} onChange={(v) => onChange({ ...data, format: v })} placeholder="Excel / PDF" />
    <Textarea label="Description" value={data.description} onChange={(v) => onChange({ ...data, description: v })} rows={3} />
    <Textarea label="Fields (one per line)" value={(data.fields || []).join('\n')} onChange={(v) => onChange({ ...data, fields: v.split('\n').filter(Boolean) })} rows={4} />
    <FileInput label="Template File (optional)" onChange={(file) => onChange({ ...data, file })} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <Input label="Display Order" type="number" value={data.displayOrder} onChange={(v) => onChange({ ...data, displayOrder: parseInt(v) })} />
      <Select label="Status" value={data.status} onChange={(v) => onChange({ ...data, status: v })} options={['draft', 'published', 'archived']} />
    </div>
    <FormActions onSave={onSave} onCancel={onCancel} />
  </FormWrapper>
);

// ─── Reusable Form Controls ───────────────────────────────────────────────────

const FormWrapper = ({ children }) => <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{children}</div>;

const Input = ({ label, value, onChange, type = 'text', placeholder = '' }) => (
  <div>
    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px', color: '#475569' }}>{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="adm-input"
    />
  </div>
);

const Textarea = ({ label, value, onChange, rows = 3 }) => (
  <div>
    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px', color: '#475569' }}>{label}</label>
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="adm-input"
      style={{ resize: 'vertical' }}
    />
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div>
    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px', color: '#475569' }}>{label}</label>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="adm-input"
      style={{ cursor: 'pointer' }}
    >
      {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const FileInput = ({ label, onChange }) => (
  <div>
    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>{label}</label>
    <input
      type="file"
      onChange={(e) => onChange(e.target.files[0])}
      accept=".pdf,.xlsx,.xls,.doc,.docx,.txt"
      style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
    />
  </div>
);

const FormActions = ({ onSave, onCancel }) => (
  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '14px', borderTop: '1px solid #F1F5F9', marginTop: '4px' }}>
    <button
      onClick={onCancel}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: '7px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', fontFamily: 'inherit' }}
    >
      <X size={14} /> Cancel
    </button>
    <button
      onClick={onSave}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#001f3f', color: 'white', border: '1px solid #003060', borderRadius: '7px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', fontFamily: 'inherit' }}
    >
      <Save size={14} /> Save
    </button>
  </div>
);

export default FrameworkManagement;