import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, parseISO, isOverdue, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filters, setFilters] = useState({
    completed: '',
    priority: '',
    tag: '',
    search: '',
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    tags: '',
  });
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [allTags, setAllTags] = useState([]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.completed) params.append('completed', filters.completed);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.tag) params.append('tag', filters.tag);
      if (filters.search) params.append('search', filters.search);
      
      const response = await api.get(`/tasks?${params.toString()}`);
      setTasks(response.data);
      
      // Extract all unique tags
      const tags = new Set();
      response.data.forEach(task => {
        task.tags?.forEach(tag => tags.add(tag));
      });
      setAllTags(Array.from(tags).sort());
    } catch (err) {
      setError('Erro ao carregar tarefas. Verifique se o servidor está rodando.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      tags: '',
    });
    setEditingTask(null);
    setShowForm(false);
  };

  // Open form for editing
  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? format(parseISO(task.dueDate), 'yyyy-MM-dd') : '',
      tags: task.tags?.join(', ') || '',
    });
    setShowForm(true);
  };

  // Submit form (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const taskData = {
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      dueDate: formData.dueDate || null,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
    };

    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask._id}`, taskData);
      } else {
        await api.post('/tasks', taskData);
      }
      resetForm();
      fetchTasks();
    } catch (err) {
      setError(editingTask ? 'Erro ao atualizar tarefa' : 'Erro ao criar tarefa');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle task completion
  const handleToggle = async (task) => {
    try {
      await api.patch(`/tasks/${task._id}/toggle`);
      fetchTasks();
    } catch (err) {
      setError('Erro ao atualizar status da tarefa');
      console.error(err);
    }
  };

  // Delete task
  const handleDelete = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchTasks();
      setShowDeleteModal(null);
    } catch (err) {
      setError('Erro ao excluir tarefa');
      console.error(err);
    }
  };

  // Format due date for display
  const formatDueDate = (dateString) => {
    if (!dateString) return null;
    const date = parseISO(dateString);
    const now = new Date();
    
    if (isToday(date)) return { text: 'Hoje', className: 'due-date today' };
    if (isTomorrow(date)) return { text: 'Amanhã', className: 'due-date tomorrow' };
    if (isOverdue(date)) return { text: format(date, 'dd/MM/yyyy', { locale: ptBR }), className: 'due-date overdue' };
    return { text: format(date, 'dd/MM/yyyy', { locale: ptBR }), className: 'due-date' };
  };

  // Get priority label
  const getPriorityLabel = (priority) => {
    const labels = { high: 'Alta', medium: 'Média', low: 'Baixa' };
    return labels[priority] || priority;
  };

  // Get priority class
  const getPriorityClass = (priority) => {
    return `priority-${priority}`;
  };

  // Filtered tasks count
  const activeTasksCount = tasks.filter(t => !t.completed).length;
  const completedTasksCount = tasks.filter(t => t.completed).length;

  if (loading && tasks.length === 0) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>Gerenciador de Tarefas</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--secondary-color)', fontSize: '0.875rem' }}>
              {activeTasksCount} pendentes • {completedTasksCount} concluídas
            </span>
            <button 
              className="btn btn-primary" 
              onClick={() => { setEditingTask(null); resetForm(); setShowForm(true); }}
            >
              + Nova Tarefa
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        {error && (
          <div style={{ 
            background: '#f8d7da', 
            color: '#721c24', 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {error}
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#721c24', cursor: 'pointer', fontSize: '1.2rem' }}>
              ×
            </button>
          </div>
        )}

        {/* Task Form */}
        {(showForm || editingTask) && (
          <div className="task-form">
            <h2>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="title">Título *</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    placeholder="O que precisa ser feito?"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="priority">Prioridade</label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Descrição</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Detalhes adicionais (opcional)"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="dueDate">Data de Vencimento</label>
                  <input
                    type="date"
                    id="dueDate"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="tags">Tags (separadas por vírgula)</label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="ex: trabalho, urgente, projeto-x"
                    list="tag-suggestions"
                  />
                  <datalist id="tag-suggestions">
                    {allTags.map(tag => <option key={tag} value={tag} />)}
                  </datalist>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Salvando...' : (editingTask ? 'Atualizar' : 'Criar')}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={resetForm}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filters.completed}
              onChange={(e) => setFilters(prev => ({ ...prev, completed: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="false">Pendentes</option>
              <option value="true">Concluídas</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Prioridade:</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
            >
              <option value="">Todas</option>
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Tag:</label>
            <select
              value={filters.tag}
              onChange={(e) => setFilters(prev => ({ ...prev, tag: e.target.value }))}
            >
              <option value="">Todas</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
          {Object.values(filters).some(v => v) && (
            <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ completed: '', priority: '', tag: '', search: '' })}>
              Limpar Filtros
            </button>
          )}
        </div>

        {/* Task List */}
        <div className="task-list">
          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>{filters.search || filters.completed || filters.priority || filters.tag 
                ? 'Nenhuma tarefa encontrada' 
                : 'Nenhuma tarefa ainda'}</h3>
              <p>{filters.search || filters.completed || filters.priority || filters.tag 
                ? 'Tente ajustar seus filtros' 
                : 'Crie sua primeira tarefa clicando em "Nova Tarefa" acima'}</p>
            </div>
          ) : (
            tasks.map(task => (
              <div 
                key={task._id} 
                className={`task-item ${getPriorityClass(task.priority)} ${task.completed ? 'completed' : ''}`}
              >
                <div className="task-checkbox">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggle(task)}
                  />
                </div>
                <div className="task-content">
                  <h3 className="task-title">{task.title}</h3>
                  {task.description && (
                    <p className="task-description">{task.description}</p>
                  )}
                  <div className="task-meta">
                    <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                    {task.dueDate && (
                      <span className={formatDueDate(task.dueDate).className}>
                        📅 {formatDueDate(task.dueDate).text}
                      </span>
                    )}
                    {task.tags && task.tags.length > 0 && (
                      <span>
                        {task.tags.map(tag => (
                          <span key={tag} className="tag">#{tag}</span>
                        ))}
                      </span>
                    )}
                    <span className="task-meta-item">
                      Criado em {format(parseISO(task.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <div className="task-actions">
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleEdit(task)}
                  >
                    ✏️ Editar
                  </button>
                  <button 
                    className="btn btn-danger btn-sm" 
                    onClick={() => setShowDeleteModal(task)}
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar Exclusão</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja excluir a tarefa <strong>"{showDeleteModal.title}"</strong>?</p>
              <p style={{ color: 'var(--secondary-color)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(null)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(showDeleteModal._id)}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;