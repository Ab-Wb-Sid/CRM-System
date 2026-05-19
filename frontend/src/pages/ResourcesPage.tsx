// ═══════════════════════════════════════════════════════
//  Resources Page — Heatmap + Developer Cards
// ═══════════════════════════════════════════════════════
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ResourceHeatmap } from '../components/heatmap/ResourceHeatmap';
import { GlassCard } from '../components/ui/GlassCard';
import {
  useCreateDeveloperMutation,
  useDeleteDeveloperMutation,
  useGetDevelopersQuery,
  useGetHeatmapDataQuery,
  useUpdateDeveloperMutation,
} from '../store/api/crmApi';
import { useAppDispatch } from '../store';
import { addNotification } from '../store/slices/uiSlice';
import type { Developer } from '../types';

export const ResourcesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: developers = [] } = useGetDevelopersQuery();
  const { data: heatmapData = [], isLoading } = useGetHeatmapDataQuery();
  const [createDeveloper] = useCreateDeveloperMutation();
  const [updateDeveloper] = useUpdateDeveloperMutation();
  const [deleteDeveloper] = useDeleteDeveloperMutation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Developer | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [capacity, setCapacity] = useState('40');
  const [skills, setSkills] = useState('');

  const openCreate = () => {
    setEditing(null);
    setName('');
    setRole('');
    setEmail('');
    setCapacity('40');
    setSkills('');
    setModalOpen(true);
  };

  const openEdit = (dev: Developer) => {
    setEditing(dev);
    setName(dev.name);
    setRole(dev.role);
    setEmail(dev.email ?? '');
    setCapacity(String(dev.weeklyCapacity));
    setSkills(dev.skills.join(', '));
    setModalOpen(true);
  };

  const saveResource = async () => {
    const payload = {
      name: name.trim(),
      role: role.trim(),
      email: email.trim(),
      weekly_capacity: Number(capacity) || 40,
      skills: skills.split(',').map(s => s.trim()).filter(Boolean),
    };
    if (!payload.name || !payload.role || !payload.email) {
      dispatch(addNotification({ type: 'warning', title: 'Missing resource details', message: 'Name, role, and email are required.' }));
      return;
    }
    if (editing) {
      await updateDeveloper({ id: editing.id, ...payload }).unwrap();
      dispatch(addNotification({ type: 'success', title: 'Resource updated', message: `${payload.name} was saved to the database.` }));
    } else {
      await createDeveloper(payload).unwrap();
      dispatch(addNotification({ type: 'success', title: 'Resource added', message: `${payload.name} was inserted into the database.` }));
    }
    setModalOpen(false);
  };

  const avgUtilization = Math.round(
    heatmapData.reduce((s, c) => s + c.utilizationPct, 0) /
    Math.max(heatmapData.length, 1)
  );

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}
      >
        {[
          { label: 'Team Members', value: developers.length, accent: 'var(--color-neon-blue)' },
          { label: 'Avg Utilization', value: `${avgUtilization}%`, accent: avgUtilization > 85 ? 'var(--color-neon-amber)' : 'var(--color-neon-green)' },
          { label: 'Overloaded', value: heatmapData.filter(c => c.utilizationPct > 90).length, accent: 'var(--color-neon-red)' },
          { label: 'Available Slots', value: heatmapData.filter(c => c.utilizationPct < 50).length, accent: 'var(--color-neon-green)' },
        ].map(({ label, value, accent }) => (
          <GlassCard key={label} style={{ padding: '14px 18px' }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: accent }}>{value}</p>
          </GlassCard>
        ))}
      </motion.div>

      {/* Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ marginBottom: 24 }}
      >
        {isLoading ? (
          <div className="skeleton rounded-2xl" style={{ height: 320 }} />
        ) : (
          <ResourceHeatmap data={heatmapData} />
        )}
      </motion.div>

      {/* Developer Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Developer Profiles
          </h2>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 cursor-pointer"
            style={{ fontSize: 12, fontWeight: 700, color: '#000', background: 'var(--color-neon-blue)', border: 'none' }}
          >
            <Plus size={13} /> Add Resource
          </button>
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {developers.map((dev, i) => {
            const thisWeek = heatmapData.find(c => c.developerId === dev.id && c.weekLabel === 'Wk 1');
            const util = thisWeek?.utilizationPct ?? 0;
            const utilColor = util > 90 ? 'var(--color-neon-red)' : util > 70 ? 'var(--color-neon-amber)' : 'var(--color-neon-green)';

            return (
              <motion.div
                key={dev.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
              >
                <GlassCard hover style={{ padding: 18 }}>
                  <div className="flex items-start gap-3" style={{ marginBottom: 12 }}>
                    <div
                      className="flex items-center justify-center rounded-xl font-bold flex-shrink-0"
                      style={{
                        width: 42, height: 42, fontSize: 14,
                        background: 'linear-gradient(135deg, var(--color-neon-blue), var(--color-neon-purple))',
                        color: '#fff',
                      }}
                    >
                      {dev.avatar}
                    </div>
                    <div className="flex-1">
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>{dev.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{dev.role}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: utilColor }}>{util}%</p>
                      <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>this week</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(dev)}
                        title="Edit resource"
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={async () => {
                          await deleteDeveloper(dev.id).unwrap();
                          dispatch(addNotification({ type: 'success', title: 'Resource deleted', message: `${dev.name} was removed from active resources.` }));
                        }}
                        title="Delete resource"
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,69,58,0.25)', background: 'rgba(255,69,58,0.08)', color: 'var(--color-neon-red)', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Utilization Bar */}
                  <div
                    className="rounded-full overflow-hidden"
                    style={{ height: 4, background: 'rgba(255,255,255,0.08)', marginBottom: 12 }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${util}%` }}
                      transition={{ duration: 0.8, delay: i * 0.06 + 0.3, ease: 'easeOut' }}
                      className="rounded-full"
                      style={{ height: '100%', background: utilColor, boxShadow: `0 0 8px ${utilColor}` }}
                    />
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1">
                    {dev.skills.map(skill => (
                      <span
                        key={skill}
                        style={{
                          fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                          background: 'rgba(255,255,255,0.06)',
                          color: 'var(--color-text-muted)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {modalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setModalOpen(false)}
        >
          <div className="glass-card rounded-xl" style={{ width: 420, padding: 20 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>{editing ? 'Edit Resource' : 'Add Resource'}</h2>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={{ width: '100%', marginBottom: 10 }} />
            <input value={role} onChange={e => setRole(e.target.value)} placeholder="Role" style={{ width: '100%', marginBottom: 10 }} />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{ width: '100%', marginBottom: 10 }} />
            <input type="number" min={1} max={168} value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="Weekly capacity" style={{ width: '100%', marginBottom: 10 }} />
            <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="Skills, comma separated" style={{ width: '100%', marginBottom: 14 }} />
            <div className="flex justify-between">
              <button onClick={() => setModalOpen(false)} className="rounded-lg px-3 py-1.5 cursor-pointer" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                Cancel
              </button>
              <button onClick={saveResource} className="rounded-lg px-3 py-1.5 cursor-pointer" style={{ background: 'var(--color-neon-blue)', border: 'none', color: '#000', fontWeight: 700 }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
