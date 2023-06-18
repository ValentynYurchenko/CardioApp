'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputTemp = document.querySelector('.form__input--temp');
const inputClimb = document.querySelector('.form__input--climb');
const totalBtns = document.querySelector('.total__btns');
const btnDeleteAll = document.querySelector('.delete_all_btn');
const btnSort = document.querySelector('.sort_btn');

const formEdit = document.querySelector('.form_edit');
const inputTypeEdit = document.querySelector('.form__input--type_edit');
const inputDistanceEdit = document.querySelector('.form__input--distance_edit');
const inputDurationEdit = document.querySelector('.form__input--duration_edit');
const inputTempEdit = document.querySelector('.form__input--temp_edit');
const inputClimbEdit = document.querySelector('.form__input--climb_edit');
const errorText = document.querySelector('.error_text');

class Workout {
  date = new Date();
  // id = (Date.now() + '').slice(-10);
  id = (Math.random() * 1e8).toString(16);
  clickNumber = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // km
    this.duration = duration; // min
  }

  _setDescription() {
    this.description =
      this.type === 'running'
        ? `Пробежка ${new Intl.DateTimeFormat('uk-UA').format(this.date)}`
        : `Велотренировка ${new Intl.DateTimeFormat('uk-UA').format(
            this.date
          )}`;
  }

  click() {
    this.clickNumber++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, temp) {
    super(coords, distance, duration);
    this.temp = temp;
    this.calculatePace();
    this._setDescription();
  }

  calculatePace() {
    // min/km
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, climb) {
    super(coords, distance, duration);
    this.climb = climb;
    this.calculateSpeed();
    this._setDescription();
  }

  calculateSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
  }
}

// const running = new Running([50, 39], 7, 40, 170);
// const cycling = new Cycling([50, 39], 37, 80, 370);
// console.log(running, cycling);

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #sort = false;
  workoutEdit;

  constructor() {
    // Получение местоположения пользователя
    this._getPosition();

    // Получение данных из local storage
    this._getLocalStorageData();

    // Добавление обработчиков события
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleClimbField);
    containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this));

    // Дополнительные фичи
    btnDeleteAll.addEventListener('click', this._deleteAllWorkouts.bind(this));
    btnSort.addEventListener('click', this._sortWorkouts.bind(this));
    inputTypeEdit.addEventListener('change', this._toggleClimbFieldEdit);
    formEdit.addEventListener('submit', this._saveEditWorkout.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Невозможно получить ваше местоположение!');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    console.log(
      `https://www.google.com/maps/@${latitude},${longitude},16z?hl=ru&entry=ttu`
    );

    const coords = [latitude, longitude];

    console.log(this);
    this.#map = L.map('map').setView(coords, 13);
    // console.log(map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // L.marker(coords).addTo(map).bindPopup('Моё местоположение').openPopup();

    // Обработка клика на карте
    this.#map.on('click', this._showForm.bind(this));

    // Отображение тренировок из local storage на карте
    this.#workouts.forEach(workout => {
      this._displayWorkout(workout);
    });
  }

  _showForm(e) {
    if (!formEdit.classList.contains('hidden')) return;

    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputTemp.value =
      inputClimb.value =
        '';
    form.classList.add('hidden');
  }

  _toggleClimbField() {
    inputClimb.closest('.form__row').classList.toggle('form__row--hidden');
    inputTemp.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // Получить данные из формы
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // Если тренировка являеться пробежкой, создать обьект Running
    if (type === 'running') {
      const temp = +inputTemp.value;
      // Проверка валидности данных
      if (
        !this.areNumbers(distance, duration, temp) ||
        !this.areNumbersPositive(distance, duration, temp)
      )
        return this.displayError();

      this.hideError();

      workout = new Running([lat, lng], distance, duration, temp);
    }

    // Если тренировка являеться велотренировкой, создать обьект Cycling
    if (type === 'cycling') {
      const climb = +inputClimb.value;
      // Проверка валидности данных
      if (
        !this.areNumbers(distance, duration, climb) ||
        !this.areNumbersPositive(distance, duration)
      )
        return this.displayError();

      this.hideError();

      workout = new Cycling([lat, lng], distance, duration, climb);
    }

    // Добавить новый обьект в массив тренировок
    this.#workouts.push(workout);

    // Отобразить тренировку на карте

    this._displayWorkout(workout);

    // Отобразить тренировку в списке

    this._displayWorkoutOnSidebar(workout);

    // Спрятать форму и очистить поля ввода данных
    this._hideForm();

    // Добавить все тренировки в локальное хранилище

    this._addWorkoutsToLocalStorage();
  }

  _displayWorkout(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 200,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚵‍♂️'} ${workout.description}`
      )
      .openPopup();
  }

  _displayWorkoutOnSidebar(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃' : '🚵‍♂️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">км</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">мин</span>
      </div>
    `;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">📏⏱</span>
            <span class="workout__value">${workout.pace.toFixed(2)}</span>
            <span class="workout__unit">мин/км</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">👟⏱</span>
            <span class="workout__value">${workout.temp}</span>
            <span class="workout__unit">шаг/мин</span>
          </div>
          <div class="workout__btns">
            <button class="workout__btn delete_btn">удалить</button>
            <button class="workout__btn edit_btn">изменить</button>
          </div>
      </li>`;
    }

    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">📏⏱</span>
            <span class="workout__value">${workout.speed.toFixed(2)}</span>
            <span class="workout__unit">км/ч</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🏔</span>
            <span class="workout__value">${workout.climb}</span>
            <span class="workout__unit">м</span>
          </div>
          <div class="workout__btns">
            <button class="workout__btn delete_btn">удалить</button>
            <button class="workout__btn edit_btn">изменить</button>
          </div>
      </li>`;
    }

    form.insertAdjacentHTML('afterend', html);

    this._displayTotalBtns();

    document
      .querySelector('.delete_btn')
      .addEventListener('click', this._removeWorkout.bind(this));

    document
      .querySelector('.edit_btn')
      .addEventListener('click', this._openEditWorkout.bind(this));
  }

  _moveToWorkout(e) {
    const workoutElement = e.target.closest('.workout');
    console.log(workoutElement);

    if (!workoutElement) return;

    const workout = this.#workouts.find(
      item => item.id === workoutElement.dataset.id
    );

    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    workout.click();
    console.log(workout);
  }

  _addWorkoutsToLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorageData() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (!data) return;

    // На основе массива обьектов полученных из local storage пересоздаем эти обьекты как экземпляры классов чтобы востановить прототипную цепь
    this.#workouts = data.map(item =>
      item.type === 'running'
        ? new Running(item.coords, item.distance, item.duration, item.temp)
        : new Cycling(item.coords, item.distance, item.duration, item.climb)
    );
    console.log(this.#workouts);

    this.#workouts.forEach(workout => {
      this._displayWorkoutOnSidebar(workout);
    });
  }

  _displayTotalBtns() {
    if (this.#workouts.length >= 2) {
      totalBtns.classList.remove('total__btns-hidden');
    }
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _deleteAllWorkouts() {
    this.reset();
  }

  _sortWorkouts(e) {
    e.stopPropagation();
    const workoutsList = document.querySelectorAll('.workout');
    if (!this.#sort) {
      const sortedWorkout = this.#workouts
        .slice()
        .sort((workout1, workout2) => workout1.distance - workout2.distance);
      workoutsList.forEach(item => item.remove());
      sortedWorkout.forEach(workout => {
        this._displayWorkoutOnSidebar(workout);
      });
      this.#sort = !this.#sort;
    } else {
      workoutsList.forEach(item => item.remove());
      this.#workouts.forEach(workout => {
        this._displayWorkoutOnSidebar(workout);
      });
      this.#sort = !this.#sort;
    }
  }

  _removeWorkout(e) {
    e.stopPropagation();
    const workoutElement = e.target.closest('.workout');

    const workoutIndex = this.#workouts.findIndex(
      item => item.id === workoutElement.dataset.id
    );

    this.#workouts.splice(workoutIndex, 1);

    this._addWorkoutsToLocalStorage();
    location.reload();
  }

  _openEditWorkout(e) {
    e.stopPropagation();

    if (!form.classList.contains('hidden')) return;

    const workoutElement = e.target.closest('.workout');

    this.workoutEdit = this.#workouts.find(
      item => item.id === workoutElement.dataset.id
    );

    formEdit.classList.remove('hidden');
    inputTypeEdit.value = this.workoutEdit.type;
    if (this.workoutEdit.type === 'running') {
      inputTempEdit.closest('.form__row').classList.remove('form__row--hidden');
      inputClimbEdit.closest('.form__row').classList.add('form__row--hidden');
      inputTempEdit.value = this.workoutEdit.temp;
    } else {
      inputClimbEdit
        .closest('.form__row')
        .classList.remove('form__row--hidden');
      inputTempEdit.closest('.form__row').classList.add('form__row--hidden');
      inputClimbEdit.value = this.workoutEdit.climb;
    }
    inputDistanceEdit.value = this.workoutEdit.distance;
    inputDurationEdit.value = this.workoutEdit.duration;
  }

  _saveEditWorkout(e) {
    e.preventDefault();

    // Получить данные из формы
    const type = inputTypeEdit.value;
    const distance = +inputDistanceEdit.value;
    const duration = +inputDurationEdit.value;

    if (type === 'running') {
      const temp = +inputTempEdit.value;
      // Проверка валидности данных
      if (
        !this.areNumbers(distance, duration, temp) ||
        !this.areNumbersPositive(distance, duration, temp)
      )
        return this.displayError();

      this.hideError();

      this.workoutEdit.type = type;
      this.workoutEdit.distance = distance;
      this.workoutEdit.duration = duration;
      this.workoutEdit.temp = temp;
    }

    if (type === 'cycling') {
      const climb = +inputClimbEdit.value;
      // Проверка валидности данных
      if (
        !this.areNumbers(distance, duration, climb) ||
        !this.areNumbersPositive(distance, duration)
      )
        return this.displayError();

      this.hideError();

      this.workoutEdit.type = type;
      this.workoutEdit.distance = distance;
      this.workoutEdit.duration = duration;
      this.workoutEdit.climb = climb;
    }

    this._addWorkoutsToLocalStorage();
    location.reload();
  }

  _toggleClimbFieldEdit() {
    inputClimbEdit.closest('.form__row').classList.toggle('form__row--hidden');
    inputTempEdit.closest('.form__row').classList.toggle('form__row--hidden');
    inputDistanceEdit.value =
      inputDurationEdit.value =
      inputTempEdit.value =
      inputClimbEdit.value =
        '';
  }

  areNumbers(...numbers) {
    return numbers.every(num => Number.isFinite(num));
  }

  areNumbersPositive(...numbers) {
    return numbers.every(num => num > 0);
  }

  displayError() {
    errorText.classList.remove('error_text_hidden');
  }

  hideError() {
    errorText.classList.add('error_text_hidden');
  }
}

const app = new App();
