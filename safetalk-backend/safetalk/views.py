from django.http import HttpResponse

def home(request):
    return HttpResponse("Safetalk backend is running 🚀")