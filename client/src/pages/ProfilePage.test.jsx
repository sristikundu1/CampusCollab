import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/auth-context.js';
import { ToastContext } from '../context/toast-context.js';
import { ProfilePage } from './ProfilePage.jsx';

const mocks = vi.hoisted(() => ({
  own: vi.fn(), ownPortfolio: vi.fn(), update: vi.fn(), replaceSkills: vi.fn(), updateAvailability: vi.fn(),
  createPortfolio: vi.fn(), updatePortfolio: vi.fn(), deletePortfolio: vi.fn(), listSkills: vi.fn(), createSkill: vi.fn(),
}));

vi.mock('../services/api.js', () => ({
  profileApi: { own: mocks.own, ownPortfolio: mocks.ownPortfolio, update: mocks.update, replaceSkills: mocks.replaceSkills, updateAvailability: mocks.updateAvailability, createPortfolio: mocks.createPortfolio, updatePortfolio: mocks.updatePortfolio, deletePortfolio: mocks.deletePortfolio },
  skillApi: { list: mocks.listSkills, create: mocks.createSkill },
  apiError: (error) => ({ message: error?.message ?? 'Request failed' }),
}));

const profile = {
  userId: 'aaaaaaaaaaaaaaaaaaaaaaaa', displayName: 'Sristi Kundu', headline: 'Student developer', department: 'CSE', graduationYear: 2027,
  bio: 'I build useful campus products.', experienceLevel: 'INTERMEDIATE', visibility: 'PLATFORM', version: 1,
  availability: { status: 'AVAILABLE', hoursPerWeek: 12, availableFrom: null }, skills: [], externalLinks: [],
  completionScore: 60, isCompleteForApplications: false, university: { name: 'United International University' }, universityVerification: { status: 'PENDING' },
};
const skills = [{ id: 'dddddddddddddddddddddddd', name: 'React', category: 'Frontend' }, { id: 'eeeeeeeeeeeeeeeeeeeeeeee', name: 'Node.js', category: 'Backend' }];

function response(data) { return Promise.resolve({ data: { data } }); }
function renderPage() {
  return render(<MemoryRouter><AuthContext.Provider value={{ user: { email: 'student@bscse.uiu.ac.bd', profile: { displayName: 'Sristi Kundu' } }, refreshUser: vi.fn(), logout: vi.fn() }}><ToastContext.Provider value={{ notify: vi.fn() }}><ProfilePage/></ToastContext.Provider></AuthContext.Provider></MemoryRouter>);
}

beforeEach(() => {
  mocks.own.mockImplementation(() => response({ profile }));
  mocks.ownPortfolio.mockImplementation(() => response({ items: [] }));
  mocks.listSkills.mockImplementation(() => response({ skills }));
  mocks.createSkill.mockImplementation((body) => response({ skill: { id: 'ffffffffffffffffffffffff', ...body } }));
  mocks.update.mockImplementation((body) => response({ profile: { ...profile, ...body, version: 2 } }));
  mocks.replaceSkills.mockImplementation((entries) => response({ profile: { ...profile, skills: entries.map((entry) => ({ id: entry.skillId, name: 'React', category: 'Frontend', level: entry.level })), version: 2 } }));
  mocks.updateAvailability.mockImplementation((availability) => response({ profile: { ...profile, availability, version: 2 } }));
  mocks.createPortfolio.mockImplementation((body) => response({ item: { id: 'cccccccccccccccccccccccc', ...body } }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('ProfilePage', () => {
  it('loads real profile data and the portfolio empty state', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Sristi Kundu' })).toBeInTheDocument();
    expect(screen.getByText('United International University')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('No portfolio projects yet.')).toBeInTheDocument();
  });

  it('edits and saves allowlisted profile fields', async () => {
    const user = userEvent.setup(); renderPage();
    await screen.findByRole('heading', { name: 'Sristi Kundu' });
    await user.click(screen.getByRole('button', { name: /Edit profile/i }));
    const headline = screen.getByLabelText('Headline');
    await user.clear(headline); await user.type(headline, 'MERN product engineer');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect(mocks.update.mock.calls[0][0].headline).toBe('MERN product engineer');
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('userId');
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('completionScore');
  });

  it('adds a canonical skill and updates approved availability', async () => {
    const user = userEvent.setup(); renderPage();
    await screen.findByText('React');
    await user.click(screen.getByText('React'));
    await user.click(screen.getByRole('button', { name: /Save skills/i }));
    await waitFor(() => expect(mocks.replaceSkills).toHaveBeenCalledWith([{ skillId: skills[0].id, level: 'BEGINNER', evidence: '' }]));
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'LIMITED' } });
    fireEvent.change(screen.getByLabelText('Hours per week'), { target: { value: '8' } });
    await user.click(screen.getByRole('button', { name: 'Update availability' }));
    await waitFor(() => expect(mocks.updateAvailability).toHaveBeenCalled());
    expect(mocks.updateAvailability.mock.calls[0][0].status).toBe('LIMITED');
    expect(mocks.updateAvailability.mock.calls[0][0].hoursPerWeek).toBe(8);
  });

  it('creates and selects a custom profile skill', async () => {
    const user=userEvent.setup(); renderPage(); await screen.findByText('React');
    await user.type(screen.getByLabelText('Custom skill name'),'Three.js'); await user.type(screen.getByLabelText('Custom skill category'),'Frontend');
    await user.click(screen.getByRole('button',{name:'Add'}));
    await waitFor(()=>expect(mocks.createSkill).toHaveBeenCalledWith({name:'Three.js',category:'Frontend'}));
    expect(await screen.findByLabelText('Three.js level')).toBeInTheDocument();
  });

  it('creates a portfolio project from the empty state', async () => {
    const user = userEvent.setup(); renderPage();
    await screen.findByText('No portfolio projects yet.');
    await user.click(screen.getByRole('button', { name: 'Add your first project' }));
    await user.type(screen.getByLabelText('Project title'), 'CampusCollab');
    await user.type(screen.getByLabelText('Description'), 'A trusted collaboration platform for university students.');
    const submitButtons = screen.getAllByRole('button', { name: 'Add project' });
    await user.click(submitButtons.at(-1));
    await waitFor(() => expect(mocks.createPortfolio).toHaveBeenCalled());
    expect(mocks.createPortfolio.mock.calls[0][0].title).toBe('CampusCollab');
  });
});
