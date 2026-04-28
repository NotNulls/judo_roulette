import random
import re
from flask import render_template, request, jsonify, flash, redirect, url_for
from app.main import bp as main_bp

from app import main

# from judo_roulette import app

# Sample Judo techniques database
TECHNIQUES = [
    # Dai Ikkyo (1st group) - Yellow Belt
    {"name": "De Ashi Harai", "category": "tachi-waza", "belt": "yellow"},
    {"name": "Hiza Guruma", "category": "tachi-waza", "belt": "yellow"},
    {"name": "Sasae Tsurikomi Ashi", "category": "tachi-waza", "belt": "yellow"},
    {"name": "Uki Goshi", "category": "tachi-waza", "belt": "yellow"},
    {"name": "Osoto Gari", "category": "tachi-waza", "belt": "yellow"},
    {"name": "O Goshi", "category": "tachi-waza", "belt": "yellow"},
    {"name": "Ouchi Gari", "category": "tachi-waza", "belt": "yellow"},
    {"name": "Seoi Nage", "category": "tachi-waza", "belt": "yellow"},

    # Dai Nikyo (2nd group) - Orange Belt
    {"name": "Kosoto Gari", "category": "tachi-waza", "belt": "orange"},
    {"name": "Kouchi Gari", "category": "tachi-waza", "belt": "orange"},
    {"name": "Koshi Guruma", "category": "tachi-waza", "belt": "orange"},
    {"name": "Tsurikomi Goshi", "category": "tachi-waza", "belt": "orange"},
    {"name": "Okuri Ashi Harai", "category": "tachi-waza", "belt": "orange"},
    {"name": "Tai Otoshi", "category": "tachi-waza", "belt": "orange"},
    {"name": "Harai Goshi", "category": "tachi-waza", "belt": "orange"},
    {"name": "Uchi Mata", "category": "tachi-waza", "belt": "orange"},

    # Dai Sankyo (3rd group) - Green Belt
    {"name": "Kosoto Gake", "category": "tachi-waza", "belt": "green"},
    {"name": "Tsuri Goshi", "category": "tachi-waza", "belt": "green"},
    {"name": "Yoko Otoshi", "category": "tachi-waza", "belt": "green"},
    {"name": "Ashi Guruma", "category": "tachi-waza", "belt": "green"},
    {"name": "Hane Goshi", "category": "tachi-waza", "belt": "green"},
    {"name": "Harai Tsurikomi Ashi", "category": "tachi-waza", "belt": "green"},
    {"name": "Tomoe Nage", "category": "tachi-waza", "belt": "green"},
    {"name": "Kata Guruma", "category": "tachi-waza", "belt": "green"},

    # Dai Yonkyo (4th Group) - Blue Belt
    {"name": "Sumi Gaeshi", "category": "tachi-waza", "belt": "blue"},
    {"name": "Tani Otoshi", "category": "tachi-waza", "belt": "blue"},
    {"name": "Hane Makikomi", "category": "tachi-waza", "belt": "blue"},
    {"name": "Sukui Nage", "category": "tachi-waza", "belt": "blue"},
    {"name": "Utsuri Goshi", "category": "tachi-waza", "belt": "blue"},
    {"name": "O Guruma", "category": "tachi-waza", "belt": "blue"},
    {"name": "Soto Makikomi", "category": "tachi-waza", "belt": "blue"},
    {"name": "Uki Otoshi", "category": "tachi-waza", "belt": "blue"},

    # Gokyo (5th group) - Brown Belt
    {"name": "Osoto Guruma", "category": "tachi-waza", "belt": "brown"},
    {"name": "Uki Waza", "category": "tachi-waza", "belt": "brown"},
    {"name": "Yoko Wakare", "category": "tachi-waza", "belt": "brown"},
    {"name": "Yoko Guruma", "category": "tachi-waza", "belt": "brown"},
    {"name": "Ushiro Goshi", "category": "tachi-waza", "belt": "brown"},
    {"name": "Ura Nage", "category": "tachi-waza", "belt": "brown"},
    {"name": "Sumi Otoshi", "category": "tachi-waza", "belt": "brown"},
    {"name": "Yoko Gake", "category": "tachi-waza", "belt": "brown"},

    # Ne-Waza (Ground techniques) - Added for completeness
    {"name": "Juji Gatame", "category": "ne-waza", "belt": "orange"},
    {"name": "Kesa Gatame", "category": "ne-waza", "belt": "yellow"},
    {"name": "Kami Shiho Gatame", "category": "ne-waza", "belt": "green"},
    {"name": "Yoko Shiho Gatame", "category": "ne-waza", "belt": "blue"},
    {"name": "Sankaku Jime", "category": "ne-waza", "belt": "brown"},
    {"name": "Hadaka Jime", "category": "ne-waza", "belt": "orange"},
    {"name": "Okuri Eri Jime", "category": "ne-waza", "belt": "brown"},
    {"name": "Ude Garami", "category": "ne-waza", "belt": "blue"},
]

BELTS = ["yellow", "orange", "green", "blue", "brown"]

def filter_techniques(category=None, belt=None):
    """Filter techniques based on category and belt level"""
    filtered = TECHNIQUES

    if category == "ne-waza":
        filtered = [t for t in filtered if t["category"] == "ne-waza"]
    elif category == "tachi-waza":
        filtered = [t for t in filtered if t["category"] == "tachi-waza"]

    if belt and belt != "all":
        belt_index = BELTS.index(belt)
        filtered = [t for t in filtered if BELTS.index(t["belt"]) <= belt_index]

    return filtered

@main_bp.route('/')
def index():
    return render_template('index.html', belts=BELTS)

@main_bp.route('/roulette', methods=['POST'])
def roulette():
    data = request.get_json()
    category = data.get('category', 'all')
    belt = data.get('belt', 'all')

    filtered = filter_techniques(category, belt)

    if not filtered:
        return jsonify({"error": "No techniques found for selected criteria"}), 404

    chosen = random.choice(filtered)
    return jsonify(chosen)

@main_bp.route('/custom', methods=['GET', 'POST'])
def custom():
    time = request.form.get('time', 180)
    # use re to validate input data
    m = re.match('\d+[smh]?$', time)
    if m is None:
        flash(u'Please enter a valid time, e.g., 34, 20s, 15m, 2h')
        return redirect(url_for('main.index'))
    if time[-1] not in 'smh':
        return redirect(url_for('main.timer', num=int(time)))
    else:
        type = {'s': 'timer', 'm': 'minutes', 'h': 'hours'}
        return redirect(url_for(type[time[-1]], num=int(time[:-1])))

@main_bp.route('/<int:num>m')
def minutes(num):
    return redirect(url_for('main.index', num=num*60))

@main_bp.route('/<int:num>h')
def hours(num):
    return redirect(url_for('main.index', num=num*3600))

# todo pomodoro mode: loop a 25-5 minutes cycle
# @main_bp.route('/pomodoro')
# def pomodoro():
#     return render_template('index.html')