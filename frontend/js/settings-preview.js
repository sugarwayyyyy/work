// Demo user data — in production this comes from StorageUtils.getUser()
const demoUser = {
    name: '張小明',
    student_id: 'B11234567',
    user_id: 42,
    role: 'student',
    avatar_path: null
};

(function init() {
    const initial   = (demoUser.name || '?').charAt(0);
    const displayId = demoUser.student_id || ('#' + demoUser.user_id);

    document.getElementById('nav-avatar-sm').textContent = initial;
    document.getElementById('nav-uname').textContent     = demoUser.name;
    document.getElementById('ndp-avatar-lg').textContent = initial;
    document.getElementById('ndp-sid').textContent       = displayId;
    document.getElementById('page-avatar').textContent   = initial;
    document.getElementById('page-name').textContent     = demoUser.name;
    document.getElementById('page-sid').textContent      = '🎓 ' + displayId;

    const trigger = document.getElementById('nav-trigger');
    const panel   = document.getElementById('nav-dd');
    const chevron = document.getElementById('nav-chevron');

    trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        const open = !panel.hidden;
        panel.hidden = open;
        chevron.classList.toggle('open', !open);
        trigger.setAttribute('aria-expanded', String(!open));
    });

    trigger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger.click(); }
        if (e.key === 'Escape') { panel.hidden = true; chevron.classList.remove('open'); }
    });

    document.addEventListener('click', function (e) {
        if (!document.querySelector('.nav-right').contains(e.target)) {
            panel.hidden = true;
            chevron.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        }
    });
})();
