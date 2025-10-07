document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const loginBtn = document.getElementById('login-btn');

    // Hàm xử lý đăng nhập
    const signInWithGoogle = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .catch(error => console.error("Lỗi đăng nhập Google:", error));
    };

    // Lắng nghe trạng thái đăng nhập
    auth.onAuthStateChanged(user => {
        if (user) {
            // Nếu người dùng đã đăng nhập, chuyển hướng họ đến trang chính
            console.log("Đã đăng nhập, chuyển hướng...");
            window.location.href = 'index.html';
        } 
        // Nếu chưa đăng nhập, không làm gì cả, chỉ chờ họ nhấn nút
    });

    // Gán sự kiện click cho nút đăng nhập
    loginBtn.addEventListener('click', signInWithGoogle);
});