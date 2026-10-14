from django.urls import path
from .views import LoginView, LogoutView, CurrentUserView, DemoLoginView

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('demo-login/', DemoLoginView.as_view(), name='auth-demo-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('user/', CurrentUserView.as_view(), name='auth-current-user'),
]
