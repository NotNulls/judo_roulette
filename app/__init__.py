import os

from flask import Flask
from config import Config


def create_app(config_class=Config):
    app = Flask(__name__)
    # app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
    app.config.from_object(config_class)



    from app.main import bp as main_bp
    app.register_blueprint(main_bp)

    return app

